import cors from "@fastify/cors";
import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import { registerCatalogRoutes } from "./catalog/register-catalog-routes.js";
import { registerCartRoutes } from "./cart/register-cart-routes.js";
import { registerOrdersRoutes } from "./orders/register-orders-routes.js";
import { prisma } from "./db.js";
import { registerPaymentRoutes } from "./payments/register-payment-routes.js";
import { registerHttpMetrics } from "./observability/register-http-metrics.js";
import { registerSystemRoutes } from "./system/register-system-routes.js";

const app = Fastify({ logger: true });
const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? "0.0.0.0";

const start = async (): Promise<void> => {
  try {
    await app.register(cors, {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
    });
    registerHttpMetrics(app);
    await registerSystemRoutes(app);
    await registerCatalogRoutes(app);
    await registerCartRoutes(app);
    await registerOrdersRoutes(app);
    await app.register(rawBody, {
      field: "rawBody",
      global: false,
      routes: ["/webhooks/stripe"],
      encoding: false,
      runFirst: true,
    });
    await registerPaymentRoutes(app);
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
