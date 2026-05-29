import type { FastifyInstance } from "fastify";
import type { ProductListItemDto } from "@packages/types";
import { prisma } from "../db.js";
import { mapProductCurrency } from "../shared/currency.js";

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

export const registerCatalogRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
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

      const dto: ProductListItemDto[] = products.map((product) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        priceCents: product.priceCents,
        currency: mapProductCurrency(product.currency),
      }));

      return dto;
    },
  );
};
