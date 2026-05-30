import type { FastifyInstance } from "fastify";
import type { CreatePaymentIntentRequestDto } from "@packages/types";
import Stripe from "stripe";
import {
  createPaymentIntentForOrder,
  getOrderById,
  markOrderPaidFromPaymentIntent,
  PaymentServiceError,
  recordWebhookEventIfNew,
  syncPaymentIntentStatus,
  toOrderDto,
} from "./payment-service.js";
import {
  getStripeClient,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "./stripe-client.js";

export const registerPaymentRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
  app.post<{
    Params: { orderId: string };
    Body: CreatePaymentIntentRequestDto;
  }>(
    "/orders/:orderId/payment-intent",
    {
      schema: {
        params: {
          type: "object",
          required: ["orderId"],
          properties: {
            orderId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          properties: {
            idempotencyKey: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!isStripeConfigured()) {
        reply.code(503);
        return { message: "Stripe is not configured on the API" };
      }

      try {
        const result = await createPaymentIntentForOrder(
          request.params.orderId,
          request.body ?? {},
        );
        reply.code(201);
        return result;
      } catch (error) {
        if (error instanceof PaymentServiceError) {
          reply.code(error.statusCode);
          return { message: error.message, code: error.code };
        }
        request.log.error(error);
        reply.code(500);
        return { message: "Failed to create payment intent" };
      }
    },
  );

  app.post<{ Params: { orderId: string } }>(
    "/orders/:orderId/payment/sync",
    {
      schema: {
        params: {
          type: "object",
          required: ["orderId"],
          properties: {
            orderId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!isStripeConfigured()) {
        reply.code(503);
        return { message: "Stripe is not configured on the API" };
      }

      const order = await getOrderById(request.params.orderId);
      if (!order) {
        reply.code(404);
        return { message: "Order not found" };
      }
      if (!order.payment) {
        reply.code(404);
        return { message: "No payment intent for this order" };
      }

      const stripe = getStripeClient();
      const intent = await stripe.paymentIntents.retrieve(
        order.payment.stripePaymentIntentId,
      );
      await syncPaymentIntentStatus(intent.id, intent.status);

      const updated = await getOrderById(request.params.orderId);
      if (!updated) {
        reply.code(404);
        return { message: "Order not found" };
      }

      return toOrderDto(updated);
    },
  );

  app.post("/webhooks/stripe", {
    config: { rawBody: true },
    handler: async (request, reply) => {
      if (!isStripeConfigured()) {
        reply.code(503);
        return { message: "Stripe is not configured on the API" };
      }

      const signature = request.headers["stripe-signature"];
      if (!signature || typeof signature !== "string") {
        reply.code(400);
        return { message: "Missing stripe-signature header" };
      }

      const rawBody = request.rawBody;
      if (!rawBody) {
        reply.code(400);
        return { message: "Missing raw body" };
      }

      const payload =
        typeof rawBody === "string" ? rawBody : Buffer.from(rawBody);

      let event: Stripe.Event;
      try {
        const stripe = getStripeClient();
        event = stripe.webhooks.constructEvent(
          payload,
          signature,
          getStripeWebhookSecret(),
        );
      } catch (error) {
        request.log.warn(error);
        reply.code(400);
        return { message: "Invalid webhook signature" };
      }

      const isNew = await recordWebhookEventIfNew(event.id, event.type);
      if (!isNew) {
        reply.code(200);
        return { received: true, duplicate: true };
      }

      switch (event.type) {
        case "payment_intent.succeeded": {
          const intent = event.data.object as Stripe.PaymentIntent;
          await markOrderPaidFromPaymentIntent(intent.id);
          break;
        }
        case "payment_intent.payment_failed":
        case "payment_intent.canceled": {
          const intent = event.data.object as Stripe.PaymentIntent;
          await syncPaymentIntentStatus(intent.id, intent.status);
          break;
        }
        default:
          break;
      }

      reply.code(200);
      return { received: true };
    },
  });
};
