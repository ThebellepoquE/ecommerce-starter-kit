import type { FastifyInstance } from "fastify";
import type { AddCartItemRequestDto } from "@packages/types";
import { prisma } from "../db.js";
import { getCartById, toCartDto } from "./cart-service.js";

export const registerCartRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
  app.post("/cart", async (_, reply) => {
    const cart = await prisma.cart.create({
      data: {},
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    reply.code(201);
    return toCartDto(cart);
  });

  app.get<{ Params: { cartId: string } }>(
    "/cart/:cartId",
    async (request, reply) => {
      const cart = await getCartById(request.params.cartId);

      if (!cart) {
        reply.code(404);
        return { message: "Cart not found" };
      }

      return toCartDto(cart);
    },
  );

  app.post<{ Params: { cartId: string }; Body: AddCartItemRequestDto }>(
    "/cart/:cartId/items",
    {
      schema: {
        params: {
          type: "object",
          required: ["cartId"],
          properties: {
            cartId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          required: ["productId", "quantity"],
          properties: {
            productId: { type: "string", minLength: 1 },
            quantity: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { cartId } = request.params;
      const { productId, quantity } = request.body;

      const cart = await prisma.cart.findUnique({ where: { id: cartId } });
      if (!cart) {
        reply.code(404);
        return { message: "Cart not found" };
      }
      if (cart.status !== "ACTIVE") {
        reply.code(409);
        return { message: "Cart is already ordered" };
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, isActive: true },
      });
      if (!product) {
        reply.code(404);
        return { message: "Product not found" };
      }

      await prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId,
            productId,
          },
        },
        update: {
          quantity: {
            increment: quantity,
          },
        },
        create: {
          cartId,
          productId,
          quantity,
        },
      });

      const updatedCart = await getCartById(cartId);
      if (!updatedCart) {
        reply.code(404);
        return { message: "Cart not found" };
      }

      return toCartDto(updatedCart);
    },
  );

  app.delete<{ Params: { cartId: string; productId: string } }>(
    "/cart/:cartId/items/:productId",
    async (request, reply) => {
      const { cartId, productId } = request.params;
      const cart = await prisma.cart.findUnique({ where: { id: cartId } });

      if (!cart) {
        reply.code(404);
        return { message: "Cart not found" };
      }

      if (cart.status !== "ACTIVE") {
        reply.code(409);
        return { message: "Cart is already ordered" };
      }

      await prisma.cartItem.deleteMany({
        where: {
          cartId,
          productId,
        },
      });

      const updatedCart = await getCartById(cartId);
      if (!updatedCart) {
        reply.code(404);
        return { message: "Cart not found" };
      }

      return toCartDto(updatedCart);
    },
  );
};
