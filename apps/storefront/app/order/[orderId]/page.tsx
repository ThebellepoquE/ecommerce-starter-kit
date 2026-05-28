"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { OrderDto } from "@packages/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const formatCurrency = (priceCents: number, currency: "EUR" | "USD"): string =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(priceCents / 100);

export default function OrderPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async (): Promise<void> => {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setMessage("No se pudo cargar la orden");
        setIsLoading(false);
        return;
      }
      const data = (await response.json()) as OrderDto;
      setOrder(data);
      setIsLoading(false);
    };

    void run();
  }, [orderId]);

  return (
    <main className="container">
      <h1>Resumen de orden</h1>
      <Link href="/">Volver al catalogo</Link>
      {isLoading ? <p>Cargando orden...</p> : null}
      {message ? <p>{message}</p> : null}
      {order ? (
        <>
          <p>Orden: {order.id}</p>
          <p>Estado: {order.status}</p>
          <section className="grid">
            {order.items.map((item) => (
              <article className="card" key={item.productId}>
                <h2>{item.productTitle}</h2>
                <p>Cantidad: {item.quantity}</p>
                <p>{formatCurrency(item.lineTotalCents, item.currency)}</p>
              </article>
            ))}
          </section>
          <p>Total: {formatCurrency(order.totalCents, order.currency)}</p>
        </>
      ) : null}
    </main>
  );
}
