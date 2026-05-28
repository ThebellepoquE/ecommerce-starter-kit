# Ecommerce Starter Kit

MVP minimo en monorepo con:
- `apps/storefront`: Next.js (TypeScript + App Router)
- `apps/api`: Fastify en TypeScript
- `packages/types`: tipos compartidos
- `packages/contracts`: contratos OpenAPI versionados + eventos de dominio

## Arranque rapido

1. `pnpm install`
2. Copiar `.env.example` a `.env` y completar `DATABASE_URL` de Neon.
3. Crear migracion inicial: `pnpm --filter @apps/api prisma:migrate --name init_catalog`
4. Seed de productos demo: `pnpm --filter @apps/api seed`
5. Levantar storefront + API: `pnpm dev`

## Endpoints API

- `GET http://localhost:4000/health` -> `{ "status": "ok" }`
- `GET http://localhost:4000/version` -> metadata minima del servicio
- `GET http://localhost:4000/products` -> lista de productos activos

## Dominios y contratos

- Bounded contexts minimos en API: `catalog`, `identity`, `orders`, `payments`, `checkout`, `cart` en `apps/api/src/bounded-contexts`.
- Contrato API versionado (v1): `packages/contracts/openapi/v1/public-api.yaml`.
- Eventos de dominio compartidos: `ProductUpdated`, `OrderPlaced`, `PaymentCaptured` en `packages/contracts/src/events.ts`.

## Apps

- Storefront: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:4000](http://localhost:4000)

## Roadmap

- Roadmap de fases y ejecucion inmediata: [`docs/roadmap.md`](docs/roadmap.md)
