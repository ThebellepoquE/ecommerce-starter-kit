#!/usr/bin/env node
/**
 * Imprime el dashboard SLO de la API en consola (JSON → tabla legible).
 * Requiere API en marcha con métricas activas.
 *
 *   pnpm slo:status
 *   pnpm slo:status -- --json
 */
const BASE_URL = (process.env.SLO_BASE_URL ?? process.env.PERF_BASE_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);
const jsonOnly = process.argv.includes("--json");

const main = async () => {
  const response = await fetch(`${BASE_URL}/metrics/slo`);
  if (!response.ok) {
    throw new Error(`GET /metrics/slo → ${response.status}`);
  }

  const data = await response.json();

  if (jsonOnly) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log("\n--- Dashboard SLO (API) ---");
  console.log(`URL: ${BASE_URL}/metrics/slo`);
  console.log(`Generado: ${data.generatedAt}`);
  console.log(
    `Uptime: ${Math.round(data.uptimeMs / 1000)}s · Peticiones: ${data.global.requests} · 5xx: ${data.global.errors5xx}`,
  );
  console.log(
    `\nObjetivos: p95 < ${data.slo.latencyP95Ms.target} ms · error 5xx < ${data.slo.errorRate5xx.target * 100}%`,
  );

  const g = data.global;
  const gOk = g.slo.latencyP95 === "ok" && g.slo.errorRate5xx === "ok" ? "✓" : "✗";
  console.log(
    `\nGlobal ${gOk}: p95=${g.latencyMs.p95} ms · error rate=${(g.errorRate5xx * 100).toFixed(2)}% · availability≈${(g.availabilityEstimate * 100).toFixed(2)}%`,
  );

  if (data.routes.length === 0) {
    console.log("\nSin tráfico registrado aún. Genera requests (pnpm dev, curl, perf:baseline).");
    return;
  }

  console.log("\n| Método | Ruta | p95 (ms) | 5xx rate | SLO |");
  console.log("|--------|------|----------|----------|-----|");
  for (const row of data.routes) {
    const ok =
      row.slo.latencyP95 === "ok" && row.slo.errorRate5xx === "ok" ? "✓" : "✗";
    console.log(
      `| ${row.method} | ${row.route} | ${row.latencyMs.p95} | ${(row.errorRate5xx * 100).toFixed(2)}% | ${ok} |`,
    );
  }

  if (!data.summary.overallHealthy) {
    console.log(
      `\n⚠ ${data.summary.routesBreachingSlo} ruta(s) fuera de SLO. Ver docs/slo-dashboard.md`,
    );
  } else {
    console.log("\n✓ Dentro de SLO (ventana en memoria desde arranque del proceso).");
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
