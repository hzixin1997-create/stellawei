import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/masters/[id]/reviews
 * 获取指定师傅的已审核评价
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createServiceClient();

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('master_id', id)
      .or('status.eq.approved,status.is.null')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // 手动关联用户信息
    const enrichedReviews = await Promise.all((reviews || []).map(async (review) => {
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', review.user_id)
        .single();

      return {
        id: review.id,
        overall_rating: review.rating,
        content: review.content,
        created_at: review.created_at,
        user: {
          full_name: userData?.full_name || 'Anonymous',
        },
      };
    }));

    return NextResponse.json({ reviews: enrichedReviews });
  } catch (error: any) {
    console.error('Master reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
