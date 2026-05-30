import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.scss";

export const metadata: Metadata = {
  title: {
    default: "Ecommerce Starter Kit",
    template: "%s | Ecommerce Starter Kit",
  },
  description:
    "Tienda online MVP con Next.js, Fastify y Stripe — catálogo, carrito y pagos.",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Ecommerce Starter Kit",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
