import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
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
    await app.register(helmet, {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    });
    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
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

    app.setErrorHandler((error: FastifyError, request, reply) => {
      if (error.validation) {
        reply.code(400).send({
          message: "Validation error",
          details: error.validation,
        });
        return;
      }

      if (error.statusCode && error.statusCode < 500) {
        reply.code(error.statusCode).send({
          message: error.message,
        });
        return;
      }

      request.log.error(error);
      reply.code(500).send({
        message: "Internal server error",
      });
    });

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
