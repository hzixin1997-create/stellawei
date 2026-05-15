import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * DELETE /api/bookings/[id]
 * 删除订单（仅限已取消或已过期的订单）
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. 先获取订单信息（验证是否已取消/过期）
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, status, payment_status, expires_at')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // 2. 只允许删除已取消的订单
    if (booking.status !== 'cancelled' && booking.payment_status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Only cancelled bookings can be deleted' },
        { status: 403 }
      )
    }

    // 3. 执行删除（Service Role，绕过 RLS）
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (deleteError) {
      console.error('Delete booking error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete booking', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Booking deleted' })
  } catch (error: any) {
    console.error('Delete booking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
