const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qkbkagkalygnfkdihcak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrYmthZ2thbHlnbmZrZGloY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQxMjE3OCwiZXhwIjoyMDg5OTg4MTc4fQ.j7JT0ic45S44TIi-IGKfRla5Kz3n1fVGtYdLNhjGSCU',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const scheduledAt = new Date();
  scheduledAt.setUTCMinutes(scheduledAt.getUTCMinutes() + 10);
  
  const { data, error } = await supabase
    .from('bookings')
    .update({
      scheduled_at: scheduledAt.toISOString(),
      reminder_sent: false,
    })
    .eq('order_number', 'BK2605189427')
    .select();
  
  if (error) {
    console.error('Update error:', error);
    process.exit(1);
  }
  
  console.log('Updated booking:', JSON.stringify(data, null, 2));
  console.log('New scheduled_at:', scheduledAt.toISOString());
}

main();
