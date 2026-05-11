"use client";

import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Stripe.js 加载（前端 publishable key）
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface CheckoutButtonProps {
  priceId: string;
  consultationId: string;
  label?: string;
}

export function CheckoutButton({
  priceId,
  consultationId,
  label = "Proceed to Payment",
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // 调用后端 API 创建 Checkout Session
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, consultationId }),
      });

      const { sessionUrl } = await res.json();

      if (sessionUrl) {
        window.location.href = sessionUrl;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCheckout} disabled={loading} className="w-full">
      {loading ? "Redirecting..." : label}
    </Button>
  );
}
