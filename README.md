# Ecommerce Starter Kit

MVP mínimo en monorepo con arquitectura modular y contratos versionados.

## Documentación

| Recurso | Descripción |
|---------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Vista del sistema, dominios, flujos, datos, CI y decisiones |
| [docs/roadmap.md](docs/roadmap.md) | Fases, hitos y criterios de escalado |
| [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) | **Regla:** actualizar docs en el mismo PR que el código |

## Stack

- `apps/storefront` — Next.js (TypeScript, App Router, SCSS)
- `apps/api` — Fastify + Prisma + Neon Postgres (EU)
- `packages/types` — DTOs compartidos
- `packages/contracts` — OpenAPI v1 + eventos de dominio

## Arranque rápido

1. `pnpm install` (Node **22**, pnpm **11.3.0**)
2. Copiar `.env.example` a `.env` (raíz y/o `apps/api/.env`) y completar variables.
3. Aplicar migraciones: `pnpm --filter @apps/api prisma:migrate`
4. Seed de productos demo: `pnpm --filter @apps/api seed`
5. Levantar storefront + API: `pnpm dev`
6. (Opcional, pagos) Stripe CLI: `stripe listen --forward-to localhost:4000/webhooks/stripe`

Variables útiles:

- API: `DATABASE_URL`, `API_PORT`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Storefront: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (opcional; la API devuelve la clave en `payment-intent`)

Tarjeta de prueba Stripe: `4242 4242 4242 4242`, cualquier fecha/CVC futuros.

## Apps

- Storefront: [http://localhost:3000](http://localhost:3000) — `/`, `/cart`, `/order/[orderId]`
- API: [http://localhost:4000](http://localhost:4000)

## Endpoints API (v1)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Health check `{ "status": "ok" }` |
| `GET` | `/version` | Metadata del servicio |
| `GET` | `/products` | Productos activos del catálogo |
| `POST` | `/cart` | Crear carrito vacío |
| `GET` | `/cart/:cartId` | Obtener carrito |
| `POST` | `/cart/:cartId/items` | Añadir o incrementar ítem |
| `DELETE` | `/cart/:cartId/items/:productId` | Quitar ítem |
| `POST` | `/orders` | Crear pedido desde carrito |
| `GET` | `/orders/:orderId` | Detalle de pedido |
| `POST` | `/orders/:orderId/payment-intent` | Crear PaymentIntent (Stripe) |
| `POST` | `/orders/:orderId/payment/sync` | Sincronizar estado de pago con Stripe |
| `POST` | `/webhooks/stripe` | Webhook Stripe (idempotente) |

Flujo de pago: catálogo → carrito → orden → pago en `/order/:orderId`. Detalle en [ARCHITECTURE.md — Pagos](ARCHITECTURE.md#pagos-stripe).

Contrato completo: `packages/contracts/openapi/v1/public-api.yaml`.

## Dominios

Bounded contexts en `apps/api/src/bounded-contexts/`: `catalog`, `cart`, `orders`, `checkout`, `payments`, `identity`. Tabla de owners y rutas: [OWNERS.md](apps/api/src/bounded-contexts/OWNERS.md).

Implementación HTTP por módulo en `apps/api/src/{catalog,cart,orders,payments,system}/`. Detalle: [ARCHITECTURE.md](ARCHITECTURE.md).

## CI

En cada PR/push a `main`: Format, Lint, Typecheck, Test, OpenAPI Contract (`pnpm contracts:check`). Ramas Neon por PR: `.github/workflows/neon_workflow.yml`.

**Deploy Production** (`.github/workflows/deploy-production.yml`): al mergear en `main` ejecuta un deploy placeholder y, si existe la variable de entorno `PROD_API_URL` en **Settings → Environments → production**, hace `GET {PROD_API_URL}/health`. Sin esa variable el healthcheck se **omite** (no falla el workflow) hasta que tengas API en producción.

Antes de abrir un PR que toque la API, ejecuta `pnpm contracts:check` y actualiza `public-api.yaml` + `api-route-manifest.ts` si añades rutas.

## Si ves *Internal Server Error* en :3000

1. Detén procesos viejos en el puerto 3000: `fuser -k 3000/tcp` (o cierra el terminal donde corría `next dev`).
2. Limpia caché y arranca de nuevo desde la raíz del monorepo:
   ```bash
   rm -rf apps/storefront/.next
   pnpm dev
   ```
3. Levanta siempre **storefront y API** juntos (`pnpm dev` en la raíz). Sin API en :4000 la home carga, pero carrito/orden fallan al fetch.
4. Next.js debe usar el root del monorepo (`apps/storefront/next.config.ts` → `outputFileTracingRoot`). Si hay un `package-lock.json` en `~/Escritorio`, no debería afectar tras esa config.
