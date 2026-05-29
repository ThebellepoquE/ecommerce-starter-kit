#!/usr/bin/env node
/**
 * Prueba de carga corta (sintética) sobre rutas críticas.
 * Más agresiva que perf:baseline (duración/conexiones mayores).
 *
 *   pnpm load:test
 *   pnpm load:test -- --assert
 *
 * Tras ejecutar, opcional: pnpm slo:status (métricas acumuladas en la API).
 */
import autocannon from "autocannon";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const BASE_URL = (process.env.LOAD_BASE_URL ?? process.env.PERF_BASE_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);
const DURATION = Number(process.env.LOAD_DURATION_SEC ?? "30");
const CONNECTIONS = Number(process.env.LOAD_CONNECTIONS ?? "25");
const P95_THRESHOLD_MS = Number(process.env.LOAD_P95_THRESHOLD_MS ?? "300");
const MAX_ERROR_RATE = Number(process.env.LOAD_MAX_ERROR_RATE ?? "0.01");
const THROUGHPUT_SKEW_RATIO = Number(process.env.LOAD_THROUGHPUT_SKEW_RATIO ?? "3");

const assertMode = process.argv.includes("--assert");

const runAutocannon = (options) =>
  new Promise((resolve, reject) => {
    autocannon({ connections: CONNECTIONS, duration: DURATION, ...options }, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });

const fetchJson = async (path, init) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${init?.method ?? "GET"} ${path} → ${response.status}: ${body}`);
  }
  return response.json();
};

const preflight = async () => {
  try {
    const health = await fetchJson("/health");
    if (health.status !== "ok") {
      throw new Error(`Unexpected /health payload: ${JSON.stringify(health)}`);
    }
  } catch (error) {
    console.error(
      `\nNo se pudo contactar la API en ${BASE_URL}.\n` +
        "Arranca la API con seed antes de la prueba de carga:\n" +
        "  pnpm --filter @apps/api dev\n",
    );
    throw error;
  }
};

const prepareCartFixture = async () => {
  const products = await fetchJson("/products");
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("No hay productos activos; ejecuta pnpm --filter @apps/api seed");
  }
  const cart = await fetchJson("/cart", { method: "POST", body: "{}" });
  await fetchJson(`/cart/${cart.id}/items`, {
    method: "POST",
    body: JSON.stringify({ productId: products[0].id, quantity: 1 }),
  });
  return { cartId: cart.id };
};

const summarize = (name, result) => {
  const total = result.requests.total;
  const errors = result.errors + result.non2xx;
  const errorRate = total > 0 ? errors / total : 0;
  const p95Ms = result.latency.p97_5;

  return {
    name,
    requests: total,
    throughputRps: Math.round(result.requests.average * 10) / 10,
    latencyMs: {
      average: Math.round(result.latency.average * 10) / 10,
      p50: result.latency.p50,
      p95: p95Ms,
      p99: result.latency.p99,
      max: result.latency.max,
    },
    errors,
    errorRate: Math.round(errorRate * 10000) / 10000,
    p95WithinThreshold: p95Ms <= P95_THRESHOLD_MS,
    errorRateWithinThreshold: errorRate <= MAX_ERROR_RATE,
  };
};

/** Señales alineadas con criterios de extracción del roadmap (evidencia sintética). */
const evaluateExtractionSignals = (routes) => {
  const signals = [];

  const latencyBreaches = routes.filter((r) => !r.p95WithinThreshold);
  if (latencyBreaches.length > 0) {
    signals.push({
      id: "latency_slo_breach",
      description:
        "p95 supera SLO en una o más rutas bajo carga sintética (posible saturación del dominio)",
      routes: latencyBreaches.map((r) => r.name),
    });
  }

  const errorBreaches = routes.filter((r) => !r.errorRateWithinThreshold);
  if (errorBreaches.length > 0) {
    signals.push({
      id: "error_rate_breach",
      description: "Tasa de error > 1 % bajo carga",
      routes: errorBreaches.map((r) => r.name),
    });
  }

  const businessRoutes = routes.filter((r) => !r.name.includes("/health"));
  const rpsValues = businessRoutes.map((r) => r.throughputRps).filter((v) => v > 0);
  if (rpsValues.length >= 2) {
    const maxRps = Math.max(...rpsValues);
    const minRps = Math.min(...rpsValues);
    const skew = minRps > 0 ? maxRps / minRps : 0;
    if (skew >= THROUGHPUT_SKEW_RATIO) {
      const hottest = businessRoutes.reduce((a, b) =>
        a.throughputRps > b.throughputRps ? a : b,
      );
      const coldest = businessRoutes.reduce((a, b) =>
        a.throughputRps < b.throughputRps ? a : b,
      );
      signals.push({
        id: "throughput_skew",
        description: `Desbalance de throughput ≥ ${THROUGHPUT_SKEW_RATIO}x entre rutas de negocio`,
        ratio: Math.round(skew * 10) / 10,
        hottest: hottest.name,
        slowest: coldest.name,
      });
    }
  }

  return {
    signals,
    extractionReviewSuggested: signals.length >= 2,
    note:
      "Señales basadas en carga sintética local. No sustituyen métricas con clientes reales ni 2 sprints de evidencia (ver docs/load-test.md).",
  };
};

const main = async () => {
  await preflight();
  const { cartId } = await prepareCartFixture();

  const scenarios = [
    { name: "GET /health", options: { url: `${BASE_URL}/health`, method: "GET" } },
    { name: "GET /products", options: { url: `${BASE_URL}/products`, method: "GET" } },
    {
      name: "POST /cart",
      options: {
        url: `${BASE_URL}/cart`,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    },
    {
      name: "GET /cart/:cartId",
      options: { url: `${BASE_URL}/cart/${cartId}`, method: "GET" },
    },
  ];

  console.log(
    `\nPrueba de carga corta · ${DURATION}s · ${CONNECTIONS} conexiones · ${BASE_URL}`,
  );
  console.log(
    "Tráfico sintético (autocannon). Sin clientes reales esto es línea base, no capacidad de producción.\n",
  );

  const results = [];
  for (const scenario of scenarios) {
    console.log(`Cargando ${scenario.name}...`);
    results.push(summarize(scenario.name, await runAutocannon(scenario.options)));
  }

  console.log("\n| Ruta | p95 (ms) | RPS | error rate |");
  console.log("|------|----------|-----|------------|");
  for (const row of results) {
    const ok = row.p95WithinThreshold && row.errorRateWithinThreshold ? "✓" : "✗";
    console.log(
      `| ${row.name} ${ok} | ${row.latencyMs.p95} | ${row.throughputRps} | ${(row.errorRate * 100).toFixed(2)}% |`,
    );
  }

  const extraction = evaluateExtractionSignals(results);

  const payload = {
    capturedAt: new Date().toISOString(),
    kind: "load-test-short",
    environment: {
      baseUrl: BASE_URL,
      durationSec: DURATION,
      connections: CONNECTIONS,
      thresholds: {
        p95Ms: P95_THRESHOLD_MS,
        maxErrorRate: MAX_ERROR_RATE,
        throughputSkewRatio: THROUGHPUT_SKEW_RATIO,
      },
      disclaimer:
        "Carga sintética en entorno local. Neon remoto y un solo proceso API. No extrapolar a producción sin tráfico real.",
    },
    routes: results,
    extraction,
    allWithinThreshold: results.every(
      (r) => r.p95WithinThreshold && r.errorRateWithinThreshold,
    ),
  };

  const outPath = join(repoRoot, "docs/load-test.results.json");
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`\nResultados: ${outPath}`);

  if (extraction.signals.length > 0) {
    console.log("\nSeñales detectadas:");
    for (const s of extraction.signals) {
      console.log(`  · ${s.id}: ${s.description}`);
    }
  }

  if (extraction.extractionReviewSuggested) {
    console.log(
      "\n⚠ ≥2 señales de extracción (sintéticas). Revisar docs/load-test.md y ARCHITECTURE.md antes de dividir servicios.",
    );
  } else {
    console.log("\nSin combinación de señales que sugiera revisión de extracción (sintético).");
  }

  console.log("\nOpcional: pnpm slo:status (snapshot SLO acumulado en la API tras esta carga).");

  if (assertMode && !payload.allWithinThreshold) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
