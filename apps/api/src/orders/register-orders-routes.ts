import type { FastifyInstance } from "fastify";
import type { CreateOrderRequestDto } from "@packages/types";
import { prisma } from "../db.js";
import { getCartById } from "../cart/cart-service.js";
import { getOrderById, toOrderDto } from "../payments/payment-service.js";
import { mapProductCurrency } from "../shared/currency.js";

export const registerOrdersRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
  app.post<{ Body: CreateOrderRequestDto }>(
    "/orders",
    {
      schema: {
        body: {
          type: "object",
          required: ["cartId"],
          properties: {
            cartId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { cartId } = request.body;
      const cart = await getCartById(cartId);

      if (!cart) {
        reply.code(404);
        return { message: "Cart not found" };
      }

      if (cart.status !== "ACTIVE") {
        reply.code(409);
        return { message: "Cart is already ordered" };
      }

      if (cart.items.length === 0) {
        reply.code(400);
        return { message: "Cart is empty" };
      }

      const totalCents = cart.items.reduce(
        (acc, item) => acc + item.quantity * item.product.priceCents,
        0,
      );
      const orderCurrency = mapProductCurrency(
        cart.items[0]?.product.currency ?? "EUR",
      );

      const createdOrderId = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            cartId: cart.id,
            totalCents,
            currency: orderCurrency,
            items: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                productSlug: item.product.slug,
                productTitle: item.product.title,
                quantity: item.quantity,
                unitPriceCents: item.product.priceCents,
                lineTotalCents: item.quantity * item.product.priceCents,
                currency: mapProductCurrency(item.product.currency),
              })),
            },
          },
        });

        await tx.cart.update({
          where: { id: cart.id },
          data: { status: "ORDERED" },
        });

        return createdOrder.id;
      });

      const order = await getOrderById(createdOrderId);
      if (!order) {
        reply.code(500);
        return { message: "Order was created but could not be loaded" };
      }

      reply.code(201);
      return toOrderDto(order);
    },
  );

  app.get<{ Params: { orderId: string } }>(
    "/orders/:orderId",
    async (request, reply) => {
      const order = await getOrderById(request.params.orderId);

      if (!order) {
        reply.code(404);
        return { message: "Order not found" };
      }

      return toOrderDto(order);
    },
  );
};
