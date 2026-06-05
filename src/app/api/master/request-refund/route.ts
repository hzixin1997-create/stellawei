import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { RefundEngine } from '@/lib/refundEngine';
import { getMessage, getLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/request-refund
 * 师傅申请退款（统一使用 RefundEngine）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, reason } = body;
    const lang = getLang(request);

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookingId' },
        { status: 400 }
      );
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    // 验证师傅身份
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    // 调用 RefundEngine 统一申请
    const result = await RefundEngine.requestRefund({
      bookingId,
      requestedBy: 'master',
      requestedById: user.id,
      requestedByEmail: user.email || undefined,
      reason: reason || 'Master did not accept the order in time',
      lang,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      refundRequestId: result.refundRequestId,
      status: result.status,
      message: result.status === 'refunded'
        ? 'Refund processed automatically'
        : 'Refund request submitted, awaiting admin review',
    });
  } catch (error: any) {
    console.error('[Master Refund API] Error:', error);
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
