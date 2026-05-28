"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";

interface CheckoutFormProps {
  clientSecret: string;
  publishableKey: string;
  orderId: string;
  apiUrl: string;
  onPaid: () => void;
}

const PaymentForm = ({
  orderId,
  apiUrl,
  onPaid,
}: {
  orderId: string;
  apiUrl: string;
  onPaid: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setMessage(result.error.message ?? "No se pudo completar el pago");
      setIsSubmitting(false);
      return;
    }

    const syncResponse = await fetch(
      `${apiUrl}/orders/${orderId}/payment/sync`,
      {
        method: "POST",
      },
    );
    if (!syncResponse.ok) {
      setMessage("Pago enviado. Esperando confirmacion del servidor...");
      setIsSubmitting(false);
      onPaid();
      return;
    }

    setIsSubmitting(false);
    onPaid();
  };

  return (
    <form
      className="payment-form"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <PaymentElement />
      {message ? (
        <p className="status-message status-message--error">{message}</p>
      ) : null}
      <button type="submit" disabled={!stripe || isSubmitting}>
        {isSubmitting ? "Procesando pago..." : "Pagar ahora"}
      </button>
    </form>
  );
};

export const CheckoutForm = ({
  clientSecret,
  publishableKey,
  orderId,
  apiUrl,
  onPaid,
}: CheckoutFormProps) => {
  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm orderId={orderId} apiUrl={apiUrl} onPaid={onPaid} />
    </Elements>
  );
};
