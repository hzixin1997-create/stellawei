import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmationToUser, sendNewBookingToMaster, sendAdminNotification } from "@/lib/resend";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing stripe-signature or webhook secret" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session, supabase);
        break;
      }
      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const metadata = session.metadata || {};
  const consultationId = metadata.consultationId;
  const bookingId = metadata.booking_id;

  // 1. 优先处理 bookings 表（实时咨询）
  if (bookingId) {
    const { data: booking, error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        status: "confirmed",
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .in("payment_status", ["pending", "pending_payment"]) // 幂等
      .select("*")
      .single();

    if (error) {
      console.error("Webhook update booking failed:", error);
    } else if (booking) {
      console.log(`✅ Webhook: Booking ${bookingId} marked as paid`);
    }
    return;
  }

  // 2. 处理 consultations 表（留言咨询）
  if (!consultationId) {
    console.error("No consultationId or booking_id in session metadata");
    return;
  }

  const { data: consultation, error } = await supabase
    .from("consultations")
    .update({
      status: "paid",
      stripe_payment_intent_id: session.payment_intent as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultationId)
    .eq("status", "pending") // 幂等：只有 pending 才更新
    .select("*, profiles(*), masters(*, profiles(*))")
    .single();

  if (error || !consultation) {
    console.error("Webhook update consultation failed:", error);
    return;
  }

  // 发送邮件（异步，不阻塞）
  try {
    await sendBookingConfirmationToUser({
      userEmail: consultation.profiles.email,
      userName: consultation.profiles.full_name || "Client",
      masterName: consultation.masters.name,
      serviceType: consultation.service_type,
      scheduledAt: consultation.scheduled_at,
      price: consultation.price_usd / 100,
    });

    if (consultation.masters.profiles?.email) {
      await sendNewBookingToMaster({
        masterEmail: consultation.masters.profiles.email,
        masterName: consultation.masters.name,
        userName: consultation.profiles.full_name || "Client",
        serviceType: consultation.service_type,
        scheduledAt: consultation.scheduled_at,
        price: consultation.price_usd / 100,
      });
    }

    await sendAdminNotification({
      consultationId: consultation.id,
      userEmail: consultation.profiles.email,
      masterName: consultation.masters.name,
      serviceType: consultation.service_type,
      price: consultation.price_usd / 100,
    });
  } catch (emailErr) {
    console.error("Webhook email notification error:", emailErr);
  }

  console.log(`✅ Webhook: Consultation ${consultationId} marked as paid`);
}

async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const metadata = session.metadata || {};
  const consultationId = metadata.consultationId;
  const bookingId = metadata.booking_id;

  // 处理 bookings 表
  if (bookingId) {
    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: "failed",
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      console.error("Webhook expired booking update failed:", error);
    } else {
      console.log(`⏰ Booking ${bookingId} cancelled (expired)`);
    }
    return;
  }

  // 处理 consultations 表
  if (!consultationId) return;

  const { error } = await supabase
    .from("consultations")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultationId);

  if (error) {
    console.error("Webhook expired update failed:", error);
  } else {
    console.log(`⏰ Consultation ${consultationId} cancelled (expired)`);
  }
}
