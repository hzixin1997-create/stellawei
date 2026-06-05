import { stripe, getPriceId } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import * as Sentry from '@sentry/nextjs';

export async function POST(request: Request) {
  try {
    const { priceId, consultationId } = await request.json();

    if (!priceId || !consultationId) {
      return NextResponse.json(
        { error: "Missing priceId or consultationId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 获取咨询信息
    const { data: consultation } = await supabase
      .from("consultations")
      .select("*, masters(slug)")
      .eq("id", consultationId)
      .single();

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    // 获取价格 ID（如果前端传的是 tier，转换为实际 Stripe Price ID）
    const stripePriceId = priceId.startsWith("price_")
      ? priceId
      : getPriceId(consultation.masters.slug, priceId);

    if (!stripePriceId) {
      return NextResponse.json(
        { error: "Invalid price configuration" },
        { status: 400 }
      );
    }

    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "alipay"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        consultationId,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/booking?canceled=true`,
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { api: 'stripe/checkout', component: 'payment' },
    });
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
