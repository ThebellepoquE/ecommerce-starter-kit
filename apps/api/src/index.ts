import Fastify from "fastify";
import type {
  AddCartItemRequestDto,
  CartDto,
  CartItemDto,
  CreateOrderRequestDto,
  OrderDto,
  OrderItemDto,
  OrderStatus,
  ProductListItemDto,
} from "@packages/types";
import type { Prisma } from "@prisma/client";
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

const mapProductCurrency = (currency: string): "EUR" | "USD" =>
  currency === "USD" ? "USD" : "EUR";

type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: true;
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

const toCartDto = (cart: CartWithItems): CartDto => {
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

const toOrderItemDto = (item: OrderWithItems["items"][number]): OrderItemDto => ({
  productId: item.productId,
  productSlug: item.productSlug,
  productTitle: item.productTitle,
  quantity: item.quantity,
  unitPriceCents: item.unitPriceCents,
  lineTotalCents: item.lineTotalCents,
  currency: mapProductCurrency(item.currency),
});

const toOrderDto = (order: OrderWithItems): OrderDto => {
  const items = order.items.map(toOrderItemDto);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return {
    id: order.id,
    cartId: order.cartId,
    status: "pending",
    items,
    totalItems,
    totalCents: order.totalCents,
    currency: mapProductCurrency(order.currency),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
};

const getCartById = async (cartId: string): Promise<CartWithItems | null> =>
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
        currency: mapProductCurrency(product.currency),
      }),
    );

    return dto;
  },
);

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

app.get<{ Params: { cartId: string } }>("/cart/:cartId", async (request, reply) => {
  const cart = await getCartById(request.params.cartId);

  if (!cart) {
    reply.code(404);
    return { message: "Cart not found" };
  }

  return toCartDto(cart);
});

app.post<{ Params: { cartId: string }; Body: AddCartItemRequestDto }>(
  "/cart/:cartId/items",
  async (request, reply) => {
    const { cartId } = request.params;
    const { productId, quantity } = request.body;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      reply.code(400);
      return { message: "Quantity must be a positive integer" };
    }

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

app.post<{ Body: CreateOrderRequestDto }>("/orders", async (request, reply) => {
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
  const orderCurrency = mapProductCurrency(cart.items[0]?.product.currency ?? "EUR");

  const order = await prisma.$transaction(async (tx) => {
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
      include: {
        items: true,
      },
    });

    await tx.cart.update({
      where: { id: cart.id },
      data: { status: "ORDERED" },
    });

    return createdOrder;
  });

  reply.code(201);
  return toOrderDto(order);
});

app.get<{ Params: { orderId: string } }>("/orders/:orderId", async (request, reply) => {
  const order = await prisma.order.findUnique({
    where: { id: request.params.orderId },
    include: {
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!order) {
    reply.code(404);
    return { message: "Order not found" };
  }

  return toOrderDto(order);
});

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
