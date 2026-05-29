export type {
  DomainEvent,
  OrderPlaced,
  PaymentCaptured,
  ProductUpdated,
} from "./events.js";

export const publicApiContractVersion = "v1" as const;
export const publicApiContractPath = "openapi/v1/public-api.yaml" as const;

export {
  IMPLEMENTED_PUBLIC_API_ROUTES,
  type PublicApiRoute,
} from "./api-route-manifest.js";
