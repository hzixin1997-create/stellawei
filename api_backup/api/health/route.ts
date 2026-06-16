import { NextResponse } from 'next/server'
import { masters, reviews } from '@/lib/data'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      masters: masters.length,
      reviews: reviews.length,
    },
  })
}
