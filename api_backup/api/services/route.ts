import { NextResponse } from 'next/server'
import { services } from '@/lib/data'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: services,
  })
}
