"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CartDto, CreateOrderRequestDto, OrderDto } from "@packages/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CART_ID_STORAGE_KEY = "storefront_cart_id";

const formatCurrency = (priceCents: number, currency: "EUR" | "USD"): string =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(priceCents / 100);

const parseError = async (response: Response): Promise<string> => {
  try {
    const json = (await response.json()) as { message?: string };
    if (json.message) {
      return json.message;
    }
  } catch {
    return "Error inesperado";
  }

  return "Error inesperado";
};

const getMessageTone = (
  message: string,
): "status-message--success" | "status-message--error" | "" => {
  const normalized = message.toLowerCase();
  if (normalized.includes("error") || normalized.includes("no se pudo")) {
    return "status-message--error";
  }
  if (normalized.includes("creado") || normalized.includes("agregado")) {
    return "status-message--success";
  }
  return "";
};

export default function CartPage() {
  const router = useRouter();
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  useEffect(() => {
    const storedCartId = window.localStorage.getItem(CART_ID_STORAGE_KEY);
    setCartId(storedCartId);
  }, []);

  useEffect(() => {
    if (!cartId) {
      setIsLoading(false);
      return;
    }

    const run = async (): Promise<void> => {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/cart/${cartId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setMessage("No se pudo cargar el carrito");
        setIsLoading(false);
        return;
      }
      const data = (await response.json()) as CartDto;
      setCart(data);
      setIsLoading(false);
    };

    void run();
  }, [cartId]);

  const removeItem = async (productId: string): Promise<void> => {
    if (!cartId) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/cart/${cartId}/items/${productId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const reason = await parseError(response);
        setMessage(`No se pudo quitar item: ${reason}`);
        return;
      }
      const data = (await response.json()) as CartDto;
      setCart(data);
    } catch {
      setMessage("No se pudo quitar item: error de red o API no disponible");
    }
  };

  const createOrder = async (): Promise<void> => {
    if (!cartId) {
      return;
    }

    setIsSubmittingOrder(true);
    setMessage(null);
    const payload: CreateOrderRequestDto = { cartId };
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const reason = await parseError(response);
      setMessage(`No se pudo crear orden: ${reason}`);
      setIsSubmittingOrder(false);
      return;
    }

    const order = (await response.json()) as OrderDto;
    window.localStorage.removeItem(CART_ID_STORAGE_KEY);
    setIsSubmittingOrder(false);
    router.push(`/order/${order.id}`);
  };

  if (!cartId) {
    return (
      <main className="container">
        <header className="page-header">
          <h1>Carrito</h1>
          <p className="subtitle">No hay carrito activo en este navegador.</p>
        </header>
        <Link href="/">Volver al catalogo</Link>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="page-header">
        <h1>Carrito</h1>
        <p className="subtitle">cartId: {cartId}</p>
      </header>
      <Link href="/">Seguir comprando</Link>

      {isLoading ? <p className="meta-text">Cargando carrito...</p> : null}
      {message ? (
        <p className={`status-message ${getMessageTone(message)}`}>{message}</p>
      ) : null}

      {cart ? (
        <>
          <h2 className="section-title">Items</h2>
          <section className="grid">
            {cart.items.map((item) => (
              <article className="card" key={item.productId}>
                <h3>{item.productTitle}</h3>
                <p className="meta-text">Cantidad: {item.quantity}</p>
                <p>{formatCurrency(item.lineTotalCents, item.currency)}</p>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void removeItem(item.productId)}
                >
                  Quitar
                </button>
              </article>
            ))}
          </section>
          {cart.items.length === 0 ? (
            <p className="empty-state">Tu carrito esta vacio.</p>
          ) : null}
          <p className="total-row">
            Total: {formatCurrency(cart.totalCents, cart.currency)}
          </p>
          <button
            type="button"
            disabled={cart.items.length === 0 || isSubmittingOrder}
            onClick={() => void createOrder()}
          >
            {isSubmittingOrder ? "Creando orden..." : "Crear orden"}
          </button>
        </>
      ) : null}
    </main>
  );
}
