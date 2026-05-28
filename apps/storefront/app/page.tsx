import type { Product } from "@packages/types";

const featuredProducts: Product[] = [
  {
    id: "p-001",
    name: "Sudadera Essentials",
    priceCents: 5999,
    currency: "EUR",
    inStock: true,
  },
  {
    id: "p-002",
    name: "Mochila Daily Carry",
    priceCents: 7499,
    currency: "EUR",
    inStock: false,
  },
];

const formatCurrency = (
  priceCents: number,
  currency: Product["currency"],
): string =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(priceCents / 100);

export default function HomePage() {
  return (
    <main className="container">
      <h1>Starter Store</h1>
      <p className="subtitle">Home minima para un MVP ecommerce.</p>

      <section className="grid">
        {featuredProducts.map((product) => (
          <article key={product.id} className="card">
            <h2>{product.name}</h2>
            <p>{formatCurrency(product.priceCents, product.currency)}</p>
            <span>{product.inStock ? "Disponible" : "Agotado"}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
