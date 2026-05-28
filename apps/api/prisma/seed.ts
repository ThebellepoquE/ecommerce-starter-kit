import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
