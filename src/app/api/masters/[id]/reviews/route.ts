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
      .select(`
        id,
        rating,
        content,
        created_at,
        user:profiles(full_name)
      `)
      .eq('master_id', id)
      .or('status.eq.approved,status.is.null')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch reviews error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // 格式化评价数据
    const formattedReviews = (reviews || []).map(r => ({
      id: r.id,
      overall_rating: r.rating,
      content: r.content,
      created_at: r.created_at,
      user: {
        full_name: r.user?.[0]?.full_name || 'Anonymous',
      },
    }));

    return NextResponse.json({ reviews: formattedReviews });
  } catch (error: any) {
    console.error('Master reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
