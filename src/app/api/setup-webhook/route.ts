import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/setup-webhook
 * 自动在 Stripe 创建 Webhook endpoint
 * 无需 API Key（仅首次配置使用，创建后建议删除或加保护）
 */
export async function GET(request: Request) {
  try {
    const stripe = getStripe();
    const endpointUrl = 'https://stellawei.org/api/webhooks/stripe';

    // 先检查是否已有同名 endpoint
    const { data: existingEndpoints } = await stripe.webhookEndpoints.list({ limit: 100 });
    const alreadyExists = existingEndpoints.some(
      (ep) => ep.url === endpointUrl && ep.status === 'enabled'
    );

    if (alreadyExists) {
      return NextResponse.json({
        success: true,
        message: 'Webhook endpoint already exists',
        url: endpointUrl,
        note: 'If payments are still not updating, check that STRIPE_WEBHOOK_SECRET is correct in Vercel env.',
      });
    }

    // 创建新的 webhook endpoint
    const endpoint = await stripe.webhookEndpoints.create({
      url: endpointUrl,
      enabled_events: [
        'checkout.session.completed',
        'checkout.session.expired',
      ],
      description: 'Stellawei production webhook - auto-created',
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook endpoint created successfully',
      webhookId: endpoint.id,
      url: endpoint.url,
      signingSecret: endpoint.secret,
      instructions: [
        '1. Copy the signingSecret above',
        '2. Go to Vercel Dashboard → Environment Variables',
        '3. Add STRIPE_WEBHOOK_SECRET = [signingSecret value]',
        '4. Redeploy the project',
      ],
    });
  } catch (error: any) {
    console.error('[setup-webhook] error:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook', message: error.message },
      { status: 500 }
    );
  }
}
