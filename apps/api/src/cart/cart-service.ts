import type { CartDto, CartItemDto } from "@packages/types";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { mapProductCurrency } from "../shared/currency.js";

export type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

const toCartItemDto = (item: CartWithItems["items"][number]): CartItemDto => ({
  productId: item.productId,
  productSlug: item.product.slug,
  productTitle: item.product.title,
  quantity: item.quantity,
  unitPriceCents: item.product.priceCents,
  lineTotalCents: item.quantity * item.product.priceCents,
  currency: mapProductCurrency(item.product.currency),
});

export const toCartDto = (cart: CartWithItems): CartDto => {
  const items = cart.items.map(toCartItemDto);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalCents = items.reduce((acc, item) => acc + item.lineTotalCents, 0);
  const currency = items[0]?.currency ?? "EUR";

  return {
    id: cart.id,
    status: cart.status === "ORDERED" ? "ordered" : "active",
    items,
    totalItems,
    totalCents,
    currency,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
};

export const getCartById = async (
  cartId: string,
): Promise<CartWithItems | null> =>
  prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
