import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI } from "openapi-types";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { IMPLEMENTED_PUBLIC_API_ROUTES } from "../src/api-route-manifest.js";

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
] as const satisfies readonly (keyof OpenAPI.PathItemObject)[];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const openApiPath = join(scriptDir, "../openapi/v1/public-api.yaml");

const routeKey = (method: string, path: string): string =>
  `${method.toUpperCase()} ${path}`;

const routesFromOpenApi = (spec: OpenAPI.Document): Set<string> => {
  const routes = new Set<string>();

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    for (const method of HTTP_METHODS) {
      if (method in pathItem && pathItem[method]) {
        routes.add(routeKey(method, path));
      }
    }
  }

  return routes;
};

const routesFromManifest = (): Set<string> =>
  new Set(
    IMPLEMENTED_PUBLIC_API_ROUTES.map(({ method, path }) =>
      routeKey(method, path),
    ),
  );

const main = async (): Promise<void> => {
  const spec = (await SwaggerParser.validate(openApiPath)) as OpenAPI.Document;

  const openApiRoutes = routesFromOpenApi(spec);
  const manifestRoutes = routesFromManifest();

  const onlyInOpenApi = [...openApiRoutes]
    .filter((route) => !manifestRoutes.has(route))
    .sort();
  const onlyInManifest = [...manifestRoutes]
    .filter((route) => !openApiRoutes.has(route))
    .sort();

  if (onlyInOpenApi.length > 0 || onlyInManifest.length > 0) {
    console.error("OpenAPI drift: implementación y contrato no coinciden.\n");

    if (onlyInOpenApi.length > 0) {
      console.error(
        "En OpenAPI pero no en api-route-manifest.ts (falta implementar o actualizar manifiesto):",
      );
      for (const route of onlyInOpenApi) {
        console.error(`  - ${route}`);
      }
      console.error("");
    }

    if (onlyInManifest.length > 0) {
      console.error(
        "En api-route-manifest.ts pero no en public-api.yaml (falta documentar contrato):",
      );
      for (const route of onlyInManifest) {
        console.error(`  - ${route}`);
      }
      console.error("");
    }

    console.error(
      "Actualiza packages/contracts/openapi/v1/public-api.yaml y packages/contracts/src/api-route-manifest.ts en el mismo PR.",
    );
    process.exit(1);
  }

  console.log(
    `OpenAPI v1 alineado: ${manifestRoutes.size} rutas públicas verificadas (${openApiPath}).`,
  );
};

main().catch((error: unknown) => {
  console.error("Error validando contrato OpenAPI:", error);
  process.exit(1);
});
