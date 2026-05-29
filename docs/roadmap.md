# Roadmap de producto y plataforma

Este roadmap aterriza el trabajo en tres fases, manteniendo el alcance corto y medible para este monorepo.

## Fase 1 - MVP estable

**Objetivos**
- Entregar un flujo e2e confiable de catalogo -> carrito -> checkout.
- Estabilizar la base de contratos y observabilidad minima.

**Entregables tecnicos**
- API publica `v1` en `packages/contracts/openapi/v1/public-api.yaml` alineada con implementacion.
- Cobertura funcional minima para `catalog`, `cart`, `checkout` y `orders` en `apps/api`.
- Instrumentacion base: logs estructurados, metricas HTTP y healthchecks para storefront y API.

**Hitos verificables**
- `pnpm lint`, `pnpm typecheck`, `pnpm build` y pruebas criticas pasan en CI.
- Endpoints de negocio principales responden con contratos validados (sin drift OpenAPI).
- Flujo de compra demo ejecutable localmente con datos seed.

**Metricas/SLO de salida**
- p95 de latencia en rutas criticas (`/products`, checkout) < 300 ms en entorno de referencia.
- Error rate 5xx < 1% en smoke/load basico.
- Disponibilidad de API en checks sinteticos >= 99.5%.

**Riesgos y mitigaciones**
- Riesgo: drift entre codigo y contrato OpenAPI.  
  Mitigacion: chequeo de contrato en CI y versionado disciplinado por dominio.
- Riesgo: deuda en limites de contexto.  
  Mitigacion: ownership explicito por bounded context y ADRs cortos para cambios de frontera.

## Fase 2 - Escalado controlado

**Objetivos**
- Soportar mayor concurrencia sin degradar experiencia.
- Reducir cuellos de botella de equipos sobre API y storefront.

**Entregables tecnicos**
- Pruebas de carga recurrentes con baseline historico por endpoint.
- Cache selectiva para catalogo y lecturas frecuentes.
- Pipeline CI con pruebas paralelas y gates por impacto (contratos, performance, seguridad).

**Hitos verificables**
- Reporte semanal de throughput, latencia y error budget.
- Separacion de ownership por modulos (ej. `catalog/orders` vs `checkout/payments`) con responsables definidos.
- Time-to-restore y tiempo de despliegue medidos y publicados.

**Metricas/SLO de salida**
- Throughput sostenido >= 3x contra baseline MVP sin romper SLO de latencia.
- p95 checkout < 400 ms bajo carga objetivo.
- MTTR < 60 minutos en incidencias P1/P2.

**Riesgos y mitigaciones**
- Riesgo: optimizar sin evidencia.  
  Mitigacion: decisiones de capacidad solo con benchmarks versionados.
- Riesgo: coupling entre equipos/modulos.  
  Mitigacion: contratos internos por contexto y revisiones de ownership trimestrales.

## Fase 3 - Optimizacion y gobernanza

**Objetivos**
- Optimizar coste/rendimiento y robustecer cumplimiento operativo.
- Consolidar una plataforma escalable por dominio/equipo.

**Entregables tecnicos**
- Observabilidad avanzada (tracing distribuido, dashboards de SLO, alertas accionables).
- Politicas de seguridad/compliance automatizadas (auditoria de cambios, secretos, retencion de logs).
- Estrategia de particion de servicios y runbooks de incidentes por dominio.

**Hitos verificables**
- Auditorias tecnicas y de seguridad sin hallazgos criticos abiertos.
- Recomendaciones de optimizacion con ROI esperado y resultado medido.
- Simulacros de incidente superados con evidencias y acciones cerradas.

**Metricas/SLO de salida**
- Coste por transaccion reducido respecto a Fase 2 con igual o mejor SLO.
- 100% de servicios criticos con trazabilidad end-to-end.
- Cumplimiento de controles obligatorios de seguridad/compliance >= 95%.

**Riesgos y mitigaciones**
- Riesgo: sobreingenieria prematura.  
  Mitigacion: priorizar solo optimizaciones con impacto medible en SLO/coste.
- Riesgo: fatiga operativa por alertas ruidosas.  
  Mitigacion: tuning continuo de alertas con SLO/error budget como fuente unica.

## Criterios de extraccion a Fastify (basados en evidencia)

Aplicar extraccion de componentes hacia servicios Fastify dedicados cuando se cumplan **2 o mas** criterios durante al menos 2 sprints:

- **Latencia:** p95/p99 de un dominio excede su SLO por saturacion local y no mejora con optimizacion intramodulo.
- **Throughput:** un bounded context concentra carga desproporcionada y escala de forma distinta al resto.
- **Ownership:** hay friccion recurrente de equipo (PR contention, despliegues bloqueados, ciclos de entrega lentos) por compartir runtime.
- **Compliance/security:** un dominio requiere controles, auditoria o aislamiento operativo distinto.

Guardrails de extraccion:
- Mantener contratos versionados en `packages/contracts`.
- Definir SLI/SLO y presupuesto de error antes del corte.
- Ejecutar migracion incremental con compatibilidad hacia atras y plan de rollback.

## Checklist priorizado (2-4 semanas)

1. [x] Publicar este roadmap y enlazarlo desde `README.md`.
2. [x] Publicar `ARCHITECTURE.md` y guia de documentacion viva en `docs/DOCUMENTATION.md`.
3. [x] Definir baseline de performance (latencia/throughput/error rate) para rutas criticas.
4. [x] Añadir gate en CI para validar drift de OpenAPI vs implementacion.
5. [x] Establecer ownership explicito por bounded context en `apps/api/src/bounded-contexts`.
6. [ ] Crear dashboard minimo con SLO de API (latencia p95, 5xx, disponibilidad).
7. [ ] Ejecutar una prueba de carga corta y documentar umbrales de extraccion a Fastify.
