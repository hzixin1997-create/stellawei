import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/webhooks
 * 列出当前 Stripe 账户中的所有 webhook endpoints（调试用）
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
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });

    const ourEndpoint = endpoints.data.find(
      (ep) => ep.url === 'https://stellawei.org/api/webhooks/stripe'
    );

    return NextResponse.json({
      total: endpoints.data.length,
      endpoints: endpoints.data.map((ep) => ({
        id: ep.id,
        url: ep.url,
        status: ep.status,
        enabledEvents: ep.enabled_events,
        secret: ep.secret ? 'configured' : 'missing',
      })),
      ourEndpoint: ourEndpoint
        ? {
            id: ourEndpoint.id,
            status: ourEndpoint.status,
            enabledEvents: ourEndpoint.enabled_events,
            secretConfigured: !!ourEndpoint.secret,
          }
        : null,
      message: ourEndpoint
        ? 'Webhook endpoint is configured'
        : 'WARNING: No webhook endpoint found for stellawei.org/api/webhooks/stripe',
    });
  } catch (error: any) {
    console.error('[debug/webhooks] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks', message: error.message },
      { status: 500 }
    );
  }
}
