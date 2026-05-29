#!/usr/bin/env node
/**
 * Baseline de rendimiento local para rutas críticas de la API.
 * Requiere API en marcha (pnpm dev o pnpm --filter @apps/api dev) y BD con seed.
 *
 * Uso:
 *   pnpm perf:baseline
 *   pnpm perf:baseline -- --assert
 */
import autocannon from "autocannon";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const BASE_URL = (process.env.PERF_BASE_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);
const DURATION = Number(process.env.PERF_DURATION_SEC ?? "10");
const CONNECTIONS = Number(process.env.PERF_CONNECTIONS ?? "10");
const P95_THRESHOLD_MS = Number(process.env.PERF_P95_THRESHOLD_MS ?? "300");
const MAX_ERROR_RATE = Number(process.env.PERF_MAX_ERROR_RATE ?? "0.01");

const assertMode = process.argv.includes("--assert");

const runAutocannon = (options) =>
  new Promise((resolve, reject) => {
    autocannon(
      {
        connections: CONNECTIONS,
        duration: DURATION,
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );
  });

const fetchJson = async (path, init) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
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
        "Arranca la API y aplica seed antes del baseline:\n" +
        "  pnpm --filter @apps/api prisma:migrate\n" +
        "  pnpm --filter @apps/api seed\n" +
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
  const productId = products[0].id;

  await fetchJson(`/cart/${cart.id}/items`, {
    method: "POST",
    body: JSON.stringify({ productId, quantity: 1 }),
  });

  return { cartId: cart.id, productId };
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

const printTable = (rows) => {
  console.log("\n--- Baseline de rendimiento (API) ---");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(
    `Duración: ${DURATION}s · Conexiones: ${CONNECTIONS} · Umbral p95: ${P95_THRESHOLD_MS} ms · Error rate máx: ${MAX_ERROR_RATE * 100}%`,
  );
  console.log(
    "\n| Ruta | Peticiones | p95 (ms) | avg (ms) | RPS | Errores | error rate |",
  );
  console.log("|------|------------|----------|----------|-----|---------|------------|");
  for (const row of rows) {
    const ok =
      row.p95WithinThreshold && row.errorRateWithinThreshold ? "✓" : "✗";
    console.log(
      `| ${row.name} ${ok} | ${row.requests} | ${row.latencyMs.p95} | ${row.latencyMs.average} | ${row.throughputRps} | ${row.errors} | ${(row.errorRate * 100).toFixed(2)}% |`,
    );
  }
};

const main = async () => {
  await preflight();
  const { cartId } = await prepareCartFixture();

  const scenarios = [
    {
      name: "GET /health",
      options: { url: `${BASE_URL}/health`, method: "GET" },
    },
    {
      name: "GET /products",
      options: { url: `${BASE_URL}/products`, method: "GET" },
    },
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

  const results = [];
  for (const scenario of scenarios) {
    console.log(`\nMidiendo ${scenario.name}...`);
    const raw = await runAutocannon(scenario.options);
    results.push(summarize(scenario.name, raw));
  }

  printTable(results);

  const payload = {
    capturedAt: new Date().toISOString(),
    environment: {
      baseUrl: BASE_URL,
      durationSec: DURATION,
      connections: CONNECTIONS,
      thresholds: {
        p95Ms: P95_THRESHOLD_MS,
        maxErrorRate: MAX_ERROR_RATE,
      },
      note:
        "Entorno de referencia local; no comparar directamente con producción sin normalizar.",
    },
    routes: results,
    allWithinThreshold: results.every(
      (r) => r.p95WithinThreshold && r.errorRateWithinThreshold,
    ),
  };

  const outPath = join(repoRoot, "docs/performance-baseline.results.json");
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`\nResultados JSON: ${outPath}`);

  if (assertMode) {
    const failed = results.filter(
      (r) => !r.p95WithinThreshold || !r.errorRateWithinThreshold,
    );
    if (failed.length > 0) {
      console.error(
        `\nModo --assert: ${failed.length} ruta(s) fuera de umbral (p95 o error rate).`,
      );
      process.exit(1);
    }
    console.log("\nModo --assert: todas las rutas dentro de umbral.");
  } else if (!payload.allWithinThreshold) {
    console.log(
      "\nAlgunas rutas superan el umbral del roadmap; revisa docs/performance-baseline.md.",
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
