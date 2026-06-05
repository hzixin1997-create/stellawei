import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RefundEngine } from '@/lib/refundEngine';
import { getLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/[id]/request-refund
 * 用户申请退款（统一使用 RefundEngine）
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const lang = getLang(request);

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 调用 RefundEngine 统一申请
    const result = await RefundEngine.requestRefund({
      bookingId: id,
      requestedBy: 'user',
      requestedById: user.id,
      requestedByEmail: user.email || undefined,
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
      autoRefund: result.status === 'refunded',
      message: result.status === 'refunded'
        ? 'Refund processed automatically'
        : 'Refund request submitted, awaiting admin review',
    });
  } catch (error: any) {
    console.error('[Refund API] Request refund error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
