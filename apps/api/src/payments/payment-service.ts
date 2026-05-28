import type {
  CreatePaymentIntentRequestDto,
  CreatePaymentIntentResponseDto,
  OrderDto,
} from "@packages/types";
import type { Currency, Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import {
  getStripeClient,
  getStripePublishableKey,
  isStripeConfigured,
} from "./stripe-client.js";
import {
  mapStripePaymentIntentStatus,
  stripeCurrency,
  toApiOrderStatus,
  toApiPaymentStatus,
} from "./mappers.js";

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: true;
    payment: true;
  };
}>;

const mapProductCurrency = (currency: string): "EUR" | "USD" =>
  currency === "USD" ? "USD" : "EUR";

const toOrderItemDto = (item: OrderWithRelations["items"][number]) => ({
  productId: item.productId,
  productSlug: item.productSlug,
  productTitle: item.productTitle,
  quantity: item.quantity,
  unitPriceCents: item.unitPriceCents,
  lineTotalCents: item.lineTotalCents,
  currency: mapProductCurrency(item.currency),
});

export const toOrderDto = (order: OrderWithRelations): OrderDto => {
  const items = order.items.map(toOrderItemDto);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return {
    id: order.id,
    cartId: order.cartId,
    status: toApiOrderStatus(order.status),
    items,
    totalItems,
    totalCents: order.totalCents,
    currency: mapProductCurrency(order.currency),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    payment: order.payment
      ? {
          status: toApiPaymentStatus(order.payment.status),
          stripePaymentIntentId: order.payment.stripePaymentIntentId,
        }
      : null,
  };
};

const orderInclude = {
  items: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
  payment: true,
};

export const getOrderById = async (
  orderId: string,
): Promise<OrderWithRelations | null> =>
  prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

export const markOrderPaidFromPaymentIntent = async (
  stripePaymentIntentId: string,
): Promise<OrderWithRelations | null> => {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId },
    include: {
      order: {
        include: orderInclude,
      },
    },
  });

  if (!payment) {
    return null;
  }

  if (payment.order.status === "PAID" && payment.status === "SUCCEEDED") {
    return payment.order;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED" },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
    }),
  ]);

  return getOrderById(payment.orderId);
};

export const syncPaymentIntentStatus = async (
  stripePaymentIntentId: string,
  stripeStatus: string,
): Promise<void> => {
  const paymentStatus = mapStripePaymentIntentStatus(stripeStatus);

  await prisma.payment.updateMany({
    where: { stripePaymentIntentId },
    data: { status: paymentStatus },
  });

  if (stripeStatus === "succeeded") {
    await markOrderPaidFromPaymentIntent(stripePaymentIntentId);
  }
};

export const createPaymentIntentForOrder = async (
  orderId: string,
  body: CreatePaymentIntentRequestDto,
): Promise<CreatePaymentIntentResponseDto> => {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  const order = await getOrderById(orderId);
  if (!order) {
    throw new PaymentServiceError("ORDER_NOT_FOUND", "Order not found", 404);
  }
  if (order.status === "PAID") {
    throw new PaymentServiceError(
      "ORDER_ALREADY_PAID",
      "Order is already paid",
      409,
    );
  }

  const stripe = getStripeClient();
  const publishableKey = getStripePublishableKey();

  if (order.payment) {
    const existing = await stripe.paymentIntents.retrieve(
      order.payment.stripePaymentIntentId,
    );
    if (existing.client_secret) {
      return {
        clientSecret: existing.client_secret,
        paymentIntentId: existing.id,
        publishableKey,
      };
    }
  }

  if (body.idempotencyKey) {
    const existingByKey = await prisma.payment.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: { order: true },
    });
    if (existingByKey && existingByKey.orderId !== orderId) {
      throw new PaymentServiceError(
        "IDEMPOTENCY_KEY_CONFLICT",
        "Idempotency key belongs to another order",
        409,
      );
    }
    if (existingByKey) {
      const intent = await stripe.paymentIntents.retrieve(
        existingByKey.stripePaymentIntentId,
      );
      if (!intent.client_secret) {
        throw new PaymentServiceError(
          "PAYMENT_INTENT_INVALID",
          "Payment intent has no client secret",
          500,
        );
      }
      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        publishableKey,
      };
    }
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: order.totalCents,
      currency: stripeCurrency(mapProductCurrency(order.currency)),
      metadata: {
        orderId: order.id,
      },
      automatic_payment_methods: { enabled: true },
    },
    body.idempotencyKey
      ? { idempotencyKey: `pi-${body.idempotencyKey}` }
      : undefined,
  );

  if (!intent.client_secret) {
    throw new PaymentServiceError(
      "PAYMENT_INTENT_INVALID",
      "Payment intent has no client secret",
      500,
    );
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      stripePaymentIntentId: intent.id,
      status: mapStripePaymentIntentStatus(intent.status),
      amountCents: order.totalCents,
      currency: order.currency as Currency,
      idempotencyKey: body.idempotencyKey ?? null,
    },
  });

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    publishableKey,
  };
};

export class PaymentServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

export const recordWebhookEventIfNew = async (
  eventId: string,
  eventType: string,
): Promise<boolean> => {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { id: eventId, type: eventType },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
};
