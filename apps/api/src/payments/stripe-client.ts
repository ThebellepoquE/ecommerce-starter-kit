import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const getStripePublishableKey = (): string => {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("STRIPE_PUBLISHABLE_KEY is required");
  }
  return key;
};

export const getStripeWebhookSecret = (): string => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required");
  }
  return secret;
};

export const getStripeClient = (): Stripe => {
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }
  return new Stripe(secretKey);
};

export const isStripeConfigured = (): boolean =>
  Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PUBLISHABLE_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET,
  );
