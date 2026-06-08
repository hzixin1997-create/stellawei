import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/public
 * 公开获取已审核通过的评价列表（用于首页展示）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10);

    const supabase = createServiceClient();

    // 获取已审核通过的评价，并关联用户和师傅信息
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, rating, content, created_at, user_id, master_id')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Public reviews fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // 丰富评价数据，获取用户和师傅信息
    const enrichedReviews = await Promise.all((reviews || []).map(async (review) => {
      // 查询用户信息（名字和地区）
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name, birth_location')
        .eq('id', review.user_id)
        .single();
      
      // 查询师傅信息
      const { data: masterData } = await supabase
        .from('masters')
        .select('display_name, name_cn')
        .eq('id', review.master_id)
        .single();

      // 如果评价是匿名的，模糊处理用户名
      const userName = userData?.full_name || '匿名用户';
      const maskedName = userName.length > 2 
        ? userName.charAt(0) + '**' + userName.charAt(userName.length - 1)
        : userName;

      return {
        id: review.id,
        rating: review.rating,
        content: review.content,
        created_at: review.created_at,
        author: maskedName,
        region: userData?.birth_location || '海外',
        masterName: masterData?.name_cn || masterData?.display_name || '师傅',
      };
    }));

    return NextResponse.json({ reviews: enrichedReviews });
  } catch (error: any) {
    console.error('Public reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
