# Orders

Contexto responsable de pedidos creados desde carrito y consulta de estado.

## Ownership

| Campo              | Valor                                           |
| ------------------ | ----------------------------------------------- |
| **Owner**          | `@ThebellepoquE`                                |
| **Rutas**          | `POST /orders`, `GET /orders/:orderId`          |
| **Implementación** | `apps/api/src/orders/register-orders-routes.ts` |

Depende de `cart` (carrito activo) y expone datos consumidos por `checkout` / `payments`.

Arquitectura global y reglas de documentacion: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md) · [docs/DOCUMENTATION.md](../../../../../docs/DOCUMENTATION.md) · [OWNERS.md](../OWNERS.md).
