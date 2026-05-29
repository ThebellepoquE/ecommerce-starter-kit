import type { FastifyInstance } from "fastify";
import { normalizePathForMetrics, recordHttpMetric } from "./http-metrics.js";

declare module "fastify" {
  interface FastifyRequest {
    metricsStartMs?: number;
  }
}

export const registerHttpMetrics = (app: FastifyInstance): void => {
  app.addHook("onRequest", async (request) => {
    request.metricsStartMs = Date.now();
  });

  app.addHook("onResponse", async (request, reply) => {
    const start = request.metricsStartMs;
    if (start === undefined) {
      return;
    }

    const latencyMs = Date.now() - start;
    const routeTemplate =
      request.routeOptions?.url ??
      normalizePathForMetrics(request.url.split("?")[0] ?? request.url);

    recordHttpMetric(
      request.method,
      routeTemplate,
      reply.statusCode,
      latencyMs,
    );
  });
};
