import { NextResponse } from 'next/server'
import { masters, services, reviews } from '@/lib/data'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      masters: masters.length,
      services: services.length,
      reviews: reviews.length,
    },
  })
}
