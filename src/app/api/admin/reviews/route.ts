import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// 管理员邮箱列表
const ADMIN_EMAILS = ['hzixin1997@gmail.com'];

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * GET /api/admin/reviews
 * 管理员获取评价列表（支持按状态筛选）
 */
export async function GET(request: Request) {
  try {
    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const supabase = createServiceClient();

    // 简化查询，先查reviews，再手动关联用户和师傅信息
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    // 获取所有相关的用户和师傅信息
    const enrichedReviews = await Promise.all((reviews || []).map(async (review) => {
      // 查询用户信息
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', review.user_id)
        .single();
      
      // 查询师傅信息
      const { data: masterData } = await supabase
        .from('masters')
        .select('display_name')
        .eq('id', review.master_id)
        .single();

      return {
        ...review,
        user: userData ? [userData] : [],
        master: masterData ? [masterData] : [],
      };
    }));

    if (error) {
      console.error('Admin reviews fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reviews: enrichedReviews || [] });
  } catch (error: any) {
    console.error('Admin reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/reviews
 * 管理员审核评价（approve / reject）
 */
export async function PATCH(request: Request) {
  try {
    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { reviewId, status } = body;

    if (!reviewId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid reviewId or status (must be approved or rejected)' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: review, error } = await supabase
      .from('reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      console.error('Review update error:', error);
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error('Admin review patch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
