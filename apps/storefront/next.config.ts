import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Evita que Next tome ~/Escritorio como root por un package-lock.json ajeno al monorepo.
  outputFileTracingRoot: path.join(dirname, "../.."),
};

export default nextConfig;
