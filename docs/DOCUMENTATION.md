# Guía de documentación viva

La documentación es parte del entregable. **Cada PR que modifique comportamiento, contratos, datos, CI o arquitectura debe incluir las actualizaciones de docs correspondientes** en el mismo PR (no en un follow-up).

## Mapa de documentos

| Documento | Cuándo actualizarlo |
|-----------|---------------------|
| [README.md](../README.md) | Arranque local, scripts, URLs, endpoints visibles, variables de entorno. |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Nuevos módulos, flujos, bounded contexts, integraciones, ADRs, diagramas, límites de seguridad. |
| [docs/roadmap.md](roadmap.md) | Fases completadas, nuevos hitos, métricas, riesgos, checklist de corto plazo. |
| [docs/performance-baseline.md](performance-baseline.md) | Metodología, umbrales y histórico del baseline local (`pnpm perf:baseline`). |
| [docs/slo-dashboard.md](slo-dashboard.md) | Dashboard SLO en vivo (`GET /metrics/slo`, `pnpm slo:status`). |
| `packages/contracts/openapi/v1/public-api.yaml` | Cualquier cambio en rutas, códigos HTTP, schemas o `operationId`. |
| `packages/contracts/src/api-route-manifest.ts` | Misma PR que OpenAPI al añadir o quitar rutas HTTP públicas. |
| `packages/types` | Campos o tipos de DTO expuestos al storefront u otros clientes. |
| `packages/contracts/src/events.ts` | Nuevos eventos o cambios de payload de dominio. |
| `apps/api/src/bounded-contexts/*/README.md` | Alcance, ownership o reglas de un dominio concreto. |
| `.env.example` | Nuevas variables obligatorias u opcionales. |
| `.github/workflows/*` | Jobs, gates, secretos/vars requeridos (describir en README o ARCHITECTURE). |

## Checklist por tipo de cambio

### API o negocio

- [ ] OpenAPI v1 alineado con rutas y respuestas reales (`pnpm contracts:check` en verde).
- [ ] `api-route-manifest.ts` actualizado si cambian rutas públicas.
- [ ] DTOs en `@packages/types` actualizados.
- [ ] `README.md` — tabla de endpoints si aplica.
- [ ] `ARCHITECTURE.md` — flujos, tablas de contextos o ADR si la decisión es estable.

### Base de datos

- [ ] Migración Prisma con nombre descriptivo.
- [ ] `ARCHITECTURE.md` — sección modelo de datos si cambia entidades o reglas.
- [ ] Seed/documentación de datos demo si el flujo local depende de ellos.

### Storefront

- [ ] Variables `NEXT_PUBLIC_*` documentadas en README / `.env.example`.
- [ ] Rutas nuevas mencionadas en README y ARCHITECTURE.

### CI / infra

- [ ] Workflow documentado en ARCHITECTURE (tabla CI/CD).
- [ ] Requisitos Node/pnpm en README si cambian.

### Refactors sin cambio de comportamiento

- Actualizar docs **solo** si cambian rutas de carpetas, nombres públicos o diagramas obsoletos.

## Calidad mínima

- Escribir en **español** (igual que el resto de docs del repo salvo identificadores de código).
- Preferir tablas y diagramas mermaid cuando expliquen flujos o límites.
- No duplicar largos trozos entre archivos: enlazar (`ARCHITECTURE` → detalle, `README` → quick start).
- Fechas o versiones solo si aportan (p. ej. ADR con contexto).

## En pull requests

Usar la plantilla en `.github/pull_request_template.md` y marcar la sección de documentación antes de pedir review.
