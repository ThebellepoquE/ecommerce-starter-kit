export const mapProductCurrency = (currency: string): "EUR" | "USD" =>
  currency === "USD" ? "USD" : "EUR";
