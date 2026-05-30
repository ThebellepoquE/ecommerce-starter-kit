import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "No encontrada",
  description: "La página que buscas no existe.",
};

export default function NotFound() {
  return (
    <main className="container">
      <header className="page-header">
        <h1>404 — Página no encontrada</h1>
        <p className="subtitle">El recurso que buscás no existe.</p>
      </header>
      <Link href="/">Volver al catálogo</Link>
    </main>
  );
}
