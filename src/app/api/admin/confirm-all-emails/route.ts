import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/confirm-all-emails
 * 批量确认所有 email_confirmed_at 为空的用户
 * 用于解决关闭 email confirmation 后已有用户无法登录的问题
 */
export async function POST() {
  try {
    const supabase = createServiceClient();

    // 1. 获取所有 email_confirmed_at 为空的用户
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('List users error:', listError);
      return NextResponse.json(
        { error: 'Failed to list users', details: listError.message },
        { status: 500 }
      );
    }

    const unconfirmedUsers = users?.users?.filter(
      (u: any) => !u.email_confirmed_at && u.email
    ) || [];

    if (unconfirmedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unconfirmed users found',
        confirmed: 0,
      });
    }

    // 2. 批量确认这些用户
    const results = [];
    const errors = [];

    for (const user of unconfirmedUsers) {
      try {
        const { data, error } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (error) {
          errors.push({ email: user.email, error: error.message });
        } else {
          results.push({ email: user.email, id: user.id });
        }
      } catch (err: any) {
        errors.push({ email: user.email, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Confirmed ${results.length} users, ${errors.length} failed`,
      confirmed: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Confirm all emails API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
