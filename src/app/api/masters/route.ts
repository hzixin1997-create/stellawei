import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { unstable_noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/masters
 * 获取所有师傅列表（包含实时状态）
 */
export async function GET() {
  unstable_noStore(); // 禁用 Next.js Data Cache，确保每次请求都查询最新数据库状态
  
  try {
    // 使用 service role client 绕过 RLS
    const supabase = createServiceClient();
    
    // 获取所有师傅
    const { data: masters, error } = await supabase
      .from('masters')
      .select('id, user_id, display_name, status, specialties, experience_years, avatar_url, rating_average, rating_count, completed_sessions, timezone, is_active');

    if (error) {
      console.error('Fetch masters error:', error);
      return NextResponse.json({ error: 'Failed to fetch masters', details: error.message }, { status: 500 });
    }

    // 获取 profiles 中的邮箱映射
    const userIds = (masters || []).map(m => m.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, email').in('id', userIds)
      : { data: [] };

    const userIdToEmail = new Map<string, string>();
    (profiles || []).forEach(p => {
      if (p.id && p.email) {
        userIdToEmail.set(p.id, p.email);
      }
    });

    // 组装返回数据
    const mastersWithStatus = (masters || []).map(m => ({
      id: m.id,
      name: m.display_name,
      status: m.status || 'online',
      specialties: m.specialties || [],
      experience_years: m.experience_years,
      avatar_url: m.avatar_url,
      rating_average: m.rating_average,
      rating_count: m.rating_count,
      completed_sessions: m.completed_sessions,
      timezone: m.timezone,
      email: userIdToEmail.get(m.user_id) || '',
      is_active: m.is_active,
    }));

    return NextResponse.json(
      { masters: mastersWithStatus },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error: any) {
    console.error('Masters API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
