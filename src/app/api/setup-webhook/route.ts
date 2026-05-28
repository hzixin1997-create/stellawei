import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/setup-webhook?key=REMINDER_API_KEY
 * 自动在 Stripe 创建 Webhook endpoint
 * 仅需执行一次，执行后记录 webhook signing secret 并配置到 Vercel
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    const expectedKey = process.env.REMINDER_API_KEY;

    if (apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        note: 'If payments are still not updating, the STRIPE_WEBHOOK_SECRET env variable may be missing or incorrect.',
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
