import Fastify from "fastify";
import type { OrderStatus, ProductListItemDto } from "@packages/types";
import type { DomainEvent } from "@packages/contracts";
import { prisma } from "./db.js";

const app = Fastify({ logger: true });
const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? "0.0.0.0";

const productListItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "slug", "title", "priceCents", "currency"],
  properties: {
    id: { type: "string" },
    slug: { type: "string" },
    title: { type: "string" },
    priceCents: { type: "number" },
    currency: { type: "string", enum: ["EUR", "USD"] },
  },
} as const;

const productsResponseSchema = {
  type: "array",
  items: productListItemSchema,
} as const;

app.get("/health", async () => {
  return { status: "ok" as const };
});

app.get("/version", async () => {
  const orderStatusExample: OrderStatus = "pending";
  return {
    name: "api",
    version: "0.1.0",
    orderStatusExample,
  };
});

app.get(
  "/products",
  {
    schema: {
      response: {
        200: productsResponseSchema,
      },
    },
  },
  async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const dto: ProductListItemDto[] = products.map(
      (product: {
        id: string;
        slug: string;
        title: string;
        priceCents: number;
        currency: string;
      }) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        priceCents: product.priceCents,
        currency: product.currency === "USD" ? "USD" : "EUR",
      }),
    );

    return dto;
  },
);

const domainEventPlaceholders: DomainEvent[] = [
  {
    type: "ProductUpdated",
    payload: {
      productId: "placeholder-product-id",
      updatedFields: ["title"],
      occurredAt: new Date(0).toISOString(),
    },
  },
  {
    type: "OrderPlaced",
    payload: {
      orderId: "placeholder-order-id",
      customerId: "placeholder-customer-id",
      totalCents: 0,
      currency: "EUR",
      occurredAt: new Date(0).toISOString(),
    },
  },
  {
    type: "PaymentCaptured",
    payload: {
      paymentId: "placeholder-payment-id",
      orderId: "placeholder-order-id",
      amountCents: 0,
      currency: "EUR",
      occurredAt: new Date(0).toISOString(),
    },
  },
];

void domainEventPlaceholders;

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

const shutdown = async (): Promise<void> => {
  await app.close();
  await prisma.$disconnect();
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

await start();
