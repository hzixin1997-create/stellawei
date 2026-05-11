import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmationToUser, sendNewBookingToMaster, sendAdminNotification } from "@/lib/resend";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect("/booking?error=no_session");
  }

  try {
    // 获取 Stripe Session 详情
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const consultationId = session.metadata?.consultationId;

    if (!consultationId) {
      return NextResponse.redirect("/booking?error=invalid_session");
    }

    const supabase = await createClient();

    // 更新订单状态为已支付
    const { data: consultation, error } = await supabase
      .from("consultations")
      .update({
        status: "paid",
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", consultationId)
      .select("*, profiles(*), masters(*, profiles(*))")
      .single();

    if (error || !consultation) {
      console.error("Update consultation error:", error);
      return NextResponse.redirect("/booking?error=update_failed");
    }

    // 发送邮件通知
    try {
      // 给用户发确认邮件
      await sendBookingConfirmationToUser({
        userEmail: consultation.profiles.email,
        userName: consultation.profiles.full_name || "Client",
        masterName: consultation.masters.name,
        serviceType: consultation.service_type,
        scheduledAt: consultation.scheduled_at,
        price: consultation.price_usd / 100,
      });

      // 给师傅发新订单通知
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

      // 给管理员（黄总）发通知
      await sendAdminNotification({
        consultationId: consultation.id,
        userEmail: consultation.profiles.email,
        masterName: consultation.masters.name,
        serviceType: consultation.service_type,
        price: consultation.price_usd / 100,
      });
    } catch (emailError) {
      // 邮件发送失败不影响主流程，只记录日志
      console.error("Email notification error:", emailError);
    }

    // 重定向到成功页面
    return NextResponse.redirect(
      `/booking/success?consultation=${consultationId}`
    );
  } catch (error: any) {
    console.error("Payment success handler error:", error);
    return NextResponse.redirect("/booking?error=payment_failed");
  }
}
