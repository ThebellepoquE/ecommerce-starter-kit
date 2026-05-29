"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CreatePaymentIntentResponseDto, OrderDto } from "@packages/types";
import { CheckoutForm } from "./checkout-form";

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
  const [checkout, setCheckout] =
    useState<CreatePaymentIntentResponseDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const preparePaymentRequestRef = useRef(0);

  const loadOrder = useCallback(async (): Promise<OrderDto | null> => {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      setMessage("No se pudo cargar la orden");
      return null;
    }
    const data = (await response.json()) as OrderDto;
    setOrder(data);
    if (data.status === "paid") {
      setMessage(null);
      setCheckout(null);
    }
    return data;
  }, [orderId]);

  useEffect(() => {
    const run = async (): Promise<void> => {
      setIsLoading(true);
      await loadOrder();
      setIsLoading(false);
    };

    void run();
  }, [loadOrder]);

  useEffect(() => {
    if (!order || order.status !== "pending" || checkout) {
      return;
    }

    const requestId = ++preparePaymentRequestRef.current;

    const preparePayment = async (): Promise<void> => {
      setIsPreparingPayment(true);
      setMessage(null);
      try {
        const response = await fetch(
          `${API_URL}/orders/${orderId}/payment-intent`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ idempotencyKey: orderId }),
          },
        );

        if (requestId !== preparePaymentRequestRef.current) {
          return;
        }

        if (response.status === 503) {
          setMessage(
            "Pagos no configurados en la API (faltan variables Stripe).",
          );
          return;
        }

        if (!response.ok) {
          const body = (await response.json()) as {
            message?: string;
            code?: string;
          };
          if (body.code === "ORDER_ALREADY_PAID") {
            await loadOrder();
            return;
          }
          setMessage(body.message ?? "No se pudo iniciar el pago");
          return;
        }

        const data = (await response.json()) as CreatePaymentIntentResponseDto;
        setCheckout(data);
      } catch {
        if (requestId !== preparePaymentRequestRef.current) {
          return;
        }
        setMessage("No se pudo iniciar el pago: error de red o API no disponible");
      } finally {
        if (requestId === preparePaymentRequestRef.current) {
          setIsPreparingPayment(false);
        }
      }
    };

    void preparePayment();
  }, [order, orderId, checkout, loadOrder]);

  const handlePaid = (): void => {
    preparePaymentRequestRef.current += 1;
    setMessage(null);
    void loadOrder();
  };

  return (
    <main className="container">
      <header className="page-header">
        <h1>Resumen de orden</h1>
        <p className="subtitle">Detalle final de la compra</p>
      </header>
      <Link href="/">Volver al catalogo</Link>
      {isLoading ? <p className="meta-text">Cargando orden...</p> : null}
      {message && order?.status !== "paid" ? (
        <p className="status-message status-message--error">{message}</p>
      ) : null}
      {order ? (
        <>
          <p className="meta-text">Orden: {order.id}</p>
          <p className="meta-text">
            Estado:{" "}
            <span
              className={
                order.status === "paid"
                  ? "status-message status-message--success"
                  : ""
              }
            >
              {order.status}
            </span>
          </p>
          <h2 className="section-title">Productos de la orden</h2>
          <section className="grid">
            {order.items.map((item) => (
              <article className="card" key={item.productId}>
                <h3>{item.productTitle}</h3>
                <p className="meta-text">Cantidad: {item.quantity}</p>
                <p>{formatCurrency(item.lineTotalCents, item.currency)}</p>
              </article>
            ))}
          </section>
          {order.items.length === 0 ? (
            <p className="empty-state">
              No hay productos registrados en esta orden.
            </p>
          ) : null}
          <p className="total-row">
            Total: {formatCurrency(order.totalCents, order.currency)}
          </p>

          {order.status === "pending" ? (
            <section className="payment-section">
              <h2 className="section-title">Pago</h2>
              {isPreparingPayment ? (
                <p className="meta-text">Preparando formulario de pago...</p>
              ) : null}
              {checkout ? (
                <CheckoutForm
                  clientSecret={checkout.clientSecret}
                  publishableKey={checkout.publishableKey}
                  orderId={order.id}
                  apiUrl={API_URL}
                  onPaid={handlePaid}
                />
              ) : null}
            </section>
          ) : null}

          {order.status === "paid" ? (
            <p className="status-message status-message--success">
              Pago confirmado. Gracias por tu compra.
            </p>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
