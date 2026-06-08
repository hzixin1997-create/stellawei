import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * 用户名模糊处理（隐私保护）
 * 保留首字母和最后一个字母，中间用 ** 替换
 * 长度 <= 2：原样保留
 * 长度 3：首 + * + 尾
 * 长度 >= 4：首 + ** + 尾
 */
function maskName(name: string): string {
  return name.split(' ').map((part) => {
    const len = part.length;
    if (len <= 2) return part;
    if (len === 3) return part[0] + '*' + part[len - 1];
    return part[0] + '**' + part[len - 1];
  }).join(' ');
}

/**
 * GET /api/reviews/featured
 * 公开API：获取展示到首页的评价
 */
export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // 查询featured评价
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('featured', true)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Featured reviews fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // 获取用户和师傅信息
    const enrichedReviews = await Promise.all((reviews || []).map(async (review) => {
      // 查询用户信息（包含地区）
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name, location, timezone')
        .eq('id', review.user_id)
        .single();
      
      // 查询师傅信息
      const { data: masterData } = await supabase
        .from('masters')
        .select('display_name')
        .eq('id', review.master_id)
        .single();

      // 根据timezone推断地区（如果location为空）
      let location = userData?.location || '';
      if (!location && userData?.timezone) {
        const timezoneMap: Record<string, string> = {
          'America/New_York': '美国',
          'America/Los_Angeles': '美国',
          'America/Chicago': '美国',
          'America/Toronto': '加拿大',
          'Europe/London': '英国',
          'Europe/Paris': '法国',
          'Asia/Shanghai': '中国',
          'Asia/Tokyo': '日本',
          'Asia/Singapore': '新加坡',
          'Australia/Sydney': '澳大利亚',
        };
        location = timezoneMap[userData.timezone] || userData.timezone.split('/')[1] || '海外';
      }

      // 用户名模糊处理（隐私保护）
      const rawName = userData?.full_name || '匿名用户';
      const maskedName = maskName(rawName);

      return {
        ...review,
        author: maskedName,
        location: location || '海外',
        masterName: masterData?.display_name || review.master_id,
        content: review.content,
        content_zh: review.content_zh || review.content,
      };
    }));

    return NextResponse.json({ reviews: enrichedReviews || [] });
  } catch (error: any) {
    console.error('Featured reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
