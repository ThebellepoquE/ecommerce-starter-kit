import { config as loadEnv } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

loadEnv({ path: new URL("../.env", import.meta.url).pathname });

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

const adapter = new PrismaNeon({ connectionString });

export const prisma = new PrismaClient({ adapter });
