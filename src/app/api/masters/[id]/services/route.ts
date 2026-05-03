import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * GET /api/masters/[id]/services
 * 获取师傅的服务列表
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = createServiceClient()

    // 查询参数
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let query = supabase
      .from('master_services')
      .select('*')
      .eq('master_id', id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data: services, error } = await query

    if (error) {
      console.error('Error fetching master services:', error)
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      )
    }

    return NextResponse.json({ services: services || [] })
  } catch (error: any) {
    console.error('Error fetching master services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services', message: error.message },
      { status: 500 }
    )
  }
}
