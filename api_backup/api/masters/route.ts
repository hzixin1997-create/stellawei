import { NextResponse } from 'next/server'
import { masters } from '@/lib/data'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: masters,
  })
}
