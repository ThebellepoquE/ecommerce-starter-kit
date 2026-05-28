export const boundedContexts = [
  "catalog",
  "identity",
  "orders",
  "payments",
  "checkout",
  "cart",
] as const;

export type BoundedContextName = (typeof boundedContexts)[number];
