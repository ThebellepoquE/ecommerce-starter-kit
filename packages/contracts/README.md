# Contracts Package

Este paquete concentra contratos versionados de API y eventos de dominio compartidos.

- OpenAPI publico: `openapi/v1/public-api.yaml`
- Manifiesto de rutas implementadas: `src/api-route-manifest.ts` (debe coincidir con el YAML)
- Tipos de eventos: `src/events.ts`
- Comprobacion de drift (local y CI): `pnpm check:openapi` o desde la raiz `pnpm contracts:check`
