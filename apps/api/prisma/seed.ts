import { config as loadEnv } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

loadEnv({ path: new URL("../.env", import.meta.url).pathname });

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run seed");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const demoProducts = [
  {
    slug: "camiseta-basica-negra",
    title: "Camiseta Basica Negra",
    priceCents: 1999,
    currency: "EUR",
    isActive: true,
  },
  {
    slug: "sudadera-unisex-gris",
    title: "Sudadera Unisex Gris",
    priceCents: 3999,
    currency: "EUR",
    isActive: true,
  },
  {
    slug: "gorra-classic-azul",
    title: "Gorra Classic Azul",
    priceCents: 1499,
    currency: "EUR",
    isActive: true,
  },
] as const;

const main = async (): Promise<void> => {
  for (const product of demoProducts) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        title: product.title,
        priceCents: product.priceCents,
        currency: product.currency,
        isActive: product.isActive,
      },
      create: product,
    });
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
