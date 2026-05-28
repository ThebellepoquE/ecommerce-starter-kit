"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  AddCartItemRequestDto,
  CartDto,
  ProductListItemDto,
} from "@packages/types";

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

export default function HomePage() {
  const [products, setProducts] = useState<ProductListItemDto[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isCreatingCart, setIsCreatingCart] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedCartId = window.localStorage.getItem(CART_ID_STORAGE_KEY);
    setCartId(storedCartId);
  }, []);

  useEffect(() => {
    const run = async (): Promise<void> => {
      setIsLoadingProducts(true);
      try {
        const response = await fetch(`${API_URL}/products`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`No se pudo cargar catalogo (${response.status})`);
        }
        const data = (await response.json()) as ProductListItemDto[];
        setProducts(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error cargando productos";
        setStatusMessage(message);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    void run();
  }, []);

  const createCart = async (): Promise<void> => {
    setIsCreatingCart(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`${API_URL}/cart`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`No se pudo crear carrito (${response.status})`);
      }
      const data = (await response.json()) as CartDto;
      window.localStorage.setItem(CART_ID_STORAGE_KEY, data.id);
      setCartId(data.id);
      setStatusMessage(`Carrito creado: ${data.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error creando carrito";
      setStatusMessage(message);
    } finally {
      setIsCreatingCart(false);
    }
  };

  const addProductToCart = async (productId: string): Promise<void> => {
    if (!cartId) {
      setStatusMessage("Crea un carrito antes de agregar productos.");
      return;
    }
    setStatusMessage(null);
    const payload: AddCartItemRequestDto = { productId, quantity: 1 };
    const response = await fetch(`${API_URL}/cart/${cartId}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await parseError(response);
      setStatusMessage(`No se pudo agregar producto: ${message}`);
      return;
    }

    setStatusMessage("Producto agregado al carrito.");
  };

  return (
    <main className="container">
      <h1>Starter Store</h1>
      <p className="subtitle">
        Catalogo conectado a API con flujo carrito a orden.
      </p>

      <div className="actions">
        <button
          type="button"
          onClick={() => void createCart()}
          disabled={isCreatingCart}
        >
          {cartId ? "Carrito activo" : "Crear carrito"}
        </button>
        <Link href="/cart">Ir al carrito</Link>
      </div>
      {cartId ? <p>cartId: {cartId}</p> : null}
      {statusMessage ? <p>{statusMessage}</p> : null}

      {isLoadingProducts ? <p>Cargando productos...</p> : null}

      <section className="grid">
        {products.map((product) => (
          <article key={product.id} className="card">
            <h2>{product.title}</h2>
            <p>{formatCurrency(product.priceCents, product.currency)}</p>
            <button
              type="button"
              onClick={() => void addProductToCart(product.id)}
            >
              Agregar al carrito
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
