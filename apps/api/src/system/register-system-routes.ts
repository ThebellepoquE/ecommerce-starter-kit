import type { FastifyInstance } from "fastify";
import type { OrderStatus } from "@packages/types";

export const registerSystemRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
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
};
