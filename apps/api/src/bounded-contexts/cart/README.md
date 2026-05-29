# Cart

Contexto responsable del carrito temporal, sus lineas y resumen de totales.

## Ownership

| Campo              | Valor                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Owner**          | `@ThebellepoquE`                                                                                       |
| **Rutas**          | `POST /cart`, `GET /cart/:cartId`, `POST /cart/:cartId/items`, `DELETE /cart/:cartId/items/:productId` |
| **Implementación** | `apps/api/src/cart/` (`register-cart-routes.ts`, `cart-service.ts`)                                    |

Arquitectura global y reglas de documentacion: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md) · [docs/DOCUMENTATION.md](../../../../../docs/DOCUMENTATION.md) · [OWNERS.md](../OWNERS.md).
