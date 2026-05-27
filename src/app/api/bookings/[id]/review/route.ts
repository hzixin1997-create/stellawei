import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/[id]/review
 * 查询指定订单的评价（用户/师傅均可查看）
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createServiceClient();

    // 查询该订单的评价（只返回 approved 状态的，或用户自己提交的 pending 状态）
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, booking_id, user_id, master_id, rating, content, status, created_at')
      .eq('booking_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch review error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch review' },
        { status: 500 }
      );
    }

    // 鉴权：获取当前用户
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    // 过滤：如果是管理员，返回所有；否则只返回 approved + 自己提交的
    const filtered = (reviews || []).filter((r) => {
      if (!user) return r.status === 'approved';
      return r.status === 'approved' || r.user_id === user.id;
    });

    return NextResponse.json({
      review: filtered[0] || null,
      hasReview: filtered.length > 0,
    });
  } catch (error: any) {
    console.error('Review GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/[id]/review
 * 用户提交对本次咨询的评价
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { rating, content } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证 booking 存在且属于当前用户
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status')
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 允许 completed、confirmed 或 in_progress 的订单被评价
    //（confirmed 表示已付款，实际咨询可能已结束但状态未更新）
    if (!['completed', 'confirmed', 'in_progress'].includes(booking.status)) {
      return NextResponse.json({ error: 'Booking is not completed' }, { status: 400 });
    }

    // 插入评价（默认 pending，需管理员审核后显示）
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        booking_id: id,
        user_id: user.id,
        master_id: booking.master_id,
        rating,
        content: content || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert review error:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit review', message: insertError.message },
        { status: 500 }
      );
    }

    // 同时更新 bookings.review_data，方便后续只读展示
    await supabase
      .from('bookings')
      .update({
        review_data: {
          rating,
          content: content || null,
          created_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error('Review API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
