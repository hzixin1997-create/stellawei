import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getMasterByEmail } from '@/lib/master-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const supabase = createServiceClient()
    
    // 从 header 获取 token 并验证用户
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = params
    const body = await req.json()
    const { isTyping } = body

    // 验证 booking 存在
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // 确定用户身份
    const masterInfo = getMasterByEmail(user.email || '');
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;
    const isUser = booking.user_id === user.id

    if (!isMaster && !isUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 更新 typing 状态（3秒后过期）
    const typingUntil = isTyping ? new Date(Date.now() + 3000).toISOString() : null
    const field = isMaster ? 'master_typing_until' : 'user_typing_until'

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ [field]: typingUntil })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Typing update error:', updateError)
      return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Typing API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
