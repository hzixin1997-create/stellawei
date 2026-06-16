import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getMessage, getLang } from '@/lib/i18n';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

const UPLOAD_TIMEOUT_MS = 30000; // 30 seconds for larger files

/**
 * POST /api/chat/[bookingId]/upload-audio
 * Voice Engine v1.0 — Stable voice upload with state machine, timeout, logging
 */
export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  const startTime = Date.now();
  const { bookingId } = params;
  const lang = getLang(request);
  let uploadLogId: string | null = null;
  let supabase: any = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const duration = formData.get('duration') as string;
    const senderType = formData.get('sender_type') as string || 'user';
    const browserType = formData.get('browser_type') as string || 'unknown';

    if (!file) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    supabase = createServiceClient();

    // 0. 鉴权：验证用户/师傅身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }
    const masterInfo = getMasterByEmail(user.email || '');
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status')
      .eq('id', bookingId)
      .single();
    if (bookingError || !booking) {
      return NextResponse.json({ error: getMessage('BOOKING_NOT_FOUND', request) }, { status: 404 });
    }
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;
    if (!isUser && !isMaster) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_USER', request) }, { status: 403 });
    }
    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      return NextResponse.json({ error: getMessage('CONSULTATION_ENDED', request) }, { status: 400 });
    }
    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: getMessage('UNPAID_BOOKING', request) }, { status: 400 });
    }

    // 1. Validate file size (15MB max)
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: getMessage('AUDIO_TOO_LARGE', request), maxSize: '15MB' },
        { status: 400 }
      );
    }

    // 2. Detect format from MIME type
    const mimeType = file.type || 'audio/webm';
    const format = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm';

    // 2.5 Validate duration (180 seconds max for Vercel Hobby)
    const audioDuration = parseInt(duration) || 0;
    if (audioDuration > 180) {
      return NextResponse.json(
        { error: getMessage('AUDIO_TOO_LONG', request), maxDuration: '180s' },
        { status: 400 }
      );
    }

    // 3. Create voice upload log entry
    const { data: logEntry, error: logError } = await supabase
      .from('voice_upload_logs')
      .insert({
        booking_id: bookingId,
        sender_type: senderType,
        audio_size: file.size,
        audio_duration: audioDuration,
        audio_format: format,
        browser_type: browserType,
        upload_started_at: new Date().toISOString(),
        status: 'uploading',
      })
      .select('id')
      .single();

    if (!logError && logEntry) {
      uploadLogId = logEntry.id;
    }

    console.log('[VoiceEngine] Upload start:', {
      logId: uploadLogId,
      bookingId,
      size: file.size,
      duration: audioDuration,
      format,
      mimeType: file.type,
      senderType,
      browserType,
    });

    // 4. Upload with timeout + URL accessibility check
    const uploadPromise = uploadToStorage(supabase, file, bookingId, format);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), UPLOAD_TIMEOUT_MS);
    });

    const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);

    // 5. Verify URL is accessible before returning
    const urlAccessible = await verifyUrlAccessible(uploadResult.publicUrl);
    if (!urlAccessible) {
      console.warn('[VoiceEngine] URL not immediately accessible, retrying...');
      // Wait 2 seconds and retry
      await new Promise(r => setTimeout(r, 2000));
      const retryAccessible = await verifyUrlAccessible(uploadResult.publicUrl);
      if (!retryAccessible) {
        console.warn('[VoiceEngine] URL still not accessible after retry');
      }
    }

    const uploadDuration = Date.now() - startTime;

    // 6. Update log on success
    if (uploadLogId) {
      await supabase
        .from('voice_upload_logs')
        .update({
          upload_completed_at: new Date().toISOString(),
          upload_duration_ms: uploadDuration,
          status: 'uploaded',
        })
        .eq('id', uploadLogId);
    }

    return NextResponse.json({
      success: true,
      audio_url: uploadResult.publicUrl,
      audio_url_signed: uploadResult.signedUrl,
      duration: audioDuration,
      size: file.size,
      format,
      upload_duration_ms: uploadDuration,
      log_id: uploadLogId,
    });
  } catch (error: any) {
    const uploadDuration = Date.now() - startTime;

    // Update log on failure
    if (uploadLogId) {
      await supabase
        .from('voice_upload_logs')
        .update({
          upload_completed_at: new Date().toISOString(),
          upload_duration_ms: uploadDuration,
          status: 'failed',
          error_message: error.message || 'Unknown error',
        })
        .eq('id', uploadLogId);
    }

    console.error('[VoiceEngine] Upload failed:', error.message, { bookingId, duration: uploadDuration });

    return NextResponse.json(
      {
        error: error.message === 'UPLOAD_TIMEOUT'
          ? getMessage('AUDIO_UPLOAD_TIMEOUT', request)
          : getMessage('AUDIO_UPLOAD_FAILED', request),
        code: error.message === 'UPLOAD_TIMEOUT' ? 'UPLOAD_TIMEOUT' : 'UPLOAD_FAILED',
      },
      { status: 500 }
    );
  }
}

async function uploadToStorage(supabase: any, file: File, bookingId: string, format: string) {
  const timestamp = Date.now();
  const fileName = `${bookingId}/${timestamp}.${format}`;

  console.log('[VoiceEngine] Storage upload start:', { fileName, size: file.size, format });

  // Try chat-audio bucket first, fallback to chat-images
  const bucketName = 'chat-audio';

  let { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      contentType: file.type || `audio/${format}`,
      upsert: false,
    });

  console.log('[VoiceEngine] Storage upload result:', {
    bucket: bucketName,
    success: !!uploadData,
    error: uploadError?.message,
    errorStatus: uploadError?.status,
  });

  // Fallback to chat-images if chat-audio doesn't exist
  if (uploadError && uploadError.message?.includes('bucket')) {
    console.log('[VoiceEngine] Falling back to chat-images bucket');
    const { data: fallbackData, error: fallbackError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        contentType: file.type || `audio/${format}`,
        upsert: false,
      });

    if (fallbackError) throw fallbackError;
    uploadData = fallbackData;
  } else if (uploadError) {
    throw uploadError;
  }

  // Get public URL
  const actualBucket = bucketName === 'chat-audio' && uploadData ? 'chat-audio' : 'chat-images';
  const { data: { publicUrl } } = supabase.storage
    .from(actualBucket)
    .getPublicUrl(fileName);

  console.log('[VoiceEngine] Public URL:', { publicUrl, bucket: actualBucket });

  return { publicUrl, signedUrl: publicUrl };
}

async function verifyUrlAccessible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return res.ok || res.status === 0; // no-cors returns opaque response with status 0
  } catch (err) {
    return false;
  }
}
