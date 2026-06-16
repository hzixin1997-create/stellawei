import { createClient } from '@supabase/supabase-js'
import { masters, reviews } from '../src/lib/data.js'

// 需要 SERVICE_ROLE_KEY 来绕过 RLS
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少必要的环境变量: SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================
// Seed Masters
// ============================================
async function seedMasters() {
  console.log('🌱 Seeding masters...')
  
  for (const master of masters) {
    // 首先创建或更新 master 记录
    const { error: masterError } = await supabase
      .from('masters')
      .upsert({
        id: master.id,
        user_id: master.user_id,
        display_name: master.display_name,
        tagline: master.tagline,
        bio: master.bio,
        avatar_url: master.avatar_url,
        specialties: master.specialties,
        languages: master.languages,
        experience_years: master.experience_years,
        certifications: master.certifications,
        is_verified: master.is_verified,
        verification_status: master.verification_status,
        base_price_tier: master.base_price_tier,
        rating_average: master.rating_average,
        rating_count: master.rating_count,
        completed_sessions: master.completed_sessions,
        timezone: master.timezone,
        is_active: master.is_active,
      }, {
        onConflict: 'id'
      })
    
    if (masterError) {
      console.error(`❌ Error seeding master ${master.id}:`, masterError.message)
    } else {
      console.log(`✅ Master: ${master.display_name}`)
    }
  }
  
  console.log('✅ Masters seeded\n')
}

// ============================================
// Seed Reviews
// ============================================
async function seedReviews() {
  console.log('🌱 Seeding reviews...')
  
  for (const review of reviews) {
    const { error } = await supabase
      .from('reviews')
      .upsert({
        id: review.id,
        order_id: review.order_id,
        user_id: review.user_id,
        master_id: review.master_id,
        overall_rating: review.overall_rating,
        accuracy_rating: review.accuracy_rating,
        communication_rating: review.communication_rating,
        value_rating: review.value_rating,
        title: review.title,
        content: review.content,
        is_anonymous: review.is_anonymous,
        status: review.status,
        created_at: review.created_at,
      }, {
        onConflict: 'id'
      })
    
    if (error) {
      console.error(`❌ Error seeding review ${review.id}:`, error.message)
    } else {
      console.log(`✅ Review: ${review.title?.substring(0, 30)}...`)
    }
  }
  
  console.log('✅ Reviews seeded\n')
}

// ============================================
// Seed Master Schedules (示例排班)
// ============================================
async function seedMasterSchedules() {
  console.log('🌱 Seeding master schedules...')
  
  const schedules = [
    // Master Zhang Yihua - 每天可用
    { master_id: 'zhang-yihua', day_of_week: 0, start_time: '09:00', end_time: '18:00' },
    { master_id: 'zhang-yihua', day_of_week: 1, start_time: '09:00', end_time: '18:00' },
    { master_id: 'zhang-yihua', day_of_week: 2, start_time: '09:00', end_time: '18:00' },
    { master_id: 'zhang-yihua', day_of_week: 3, start_time: '09:00', end_time: '18:00' },
    { master_id: 'zhang-yihua', day_of_week: 4, start_time: '09:00', end_time: '18:00' },
    { master_id: 'zhang-yihua', day_of_week: 5, start_time: '10:00', end_time: '16:00' },
    { master_id: 'zhang-yihua', day_of_week: 6, start_time: '10:00', end_time: '16:00' },
    
    // Master Wu Yang - 工作日可用
    { master_id: 'wu-yang', day_of_week: 1, start_time: '10:00', end_time: '19:00' },
    { master_id: 'wu-yang', day_of_week: 2, start_time: '10:00', end_time: '19:00' },
    { master_id: 'wu-yang', day_of_week: 3, start_time: '10:00', end_time: '19:00' },
    { master_id: 'wu-yang', day_of_week: 4, start_time: '10:00', end_time: '19:00' },
    { master_id: 'wu-yang', day_of_week: 5, start_time: '10:00', end_time: '17:00' },
    
    // Master Luna - 周末和晚上
    { master_id: 'master-luna', day_of_week: 0, start_time: '10:00', end_time: '20:00' },
    { master_id: 'master-luna', day_of_week: 1, start_time: '18:00', end_time: '22:00' },
    { master_id: 'master-luna', day_of_week: 2, start_time: '18:00', end_time: '22:00' },
    { master_id: 'master-luna', day_of_week: 3, start_time: '18:00', end_time: '22:00' },
    { master_id: 'master-luna', day_of_week: 4, start_time: '18:00', end_time: '22:00' },
    { master_id: 'master-luna', day_of_week: 5, start_time: '18:00', end_time: '23:00' },
    { master_id: 'master-luna', day_of_week: 6, start_time: '10:00', end_time: '23:00' },
    
    // Master Lin
    { master_id: 'master-lin', day_of_week: 0, start_time: '09:00', end_time: '17:00' },
    { master_id: 'master-lin', day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    { master_id: 'master-lin', day_of_week: 2, start_time: '09:00', end_time: '17:00' },
    { master_id: 'master-lin', day_of_week: 3, start_time: '09:00', end_time: '17:00' },
    { master_id: 'master-lin', day_of_week: 4, start_time: '09:00', end_time: '17:00' },
    { master_id: 'master-lin', day_of_week: 5, start_time: '10:00', end_time: '15:00' },
    
    // Master Han
    { master_id: 'master-han', day_of_week: 1, start_time: '14:00', end_time: '21:00' },
    { master_id: 'master-han', day_of_week: 2, start_time: '14:00', end_time: '21:00' },
    { master_id: 'master-han', day_of_week: 3, start_time: '14:00', end_time: '21:00' },
    { master_id: 'master-han', day_of_week: 4, start_time: '14:00', end_time: '21:00' },
    { master_id: 'master-han', day_of_week: 5, start_time: '14:00', end_time: '20:00' },
    { master_id: 'master-han', day_of_week: 6, start_time: '10:00', end_time: '18:00' },
    
    // Master Elena
    { master_id: 'master-elena', day_of_week: 0, start_time: '11:00', end_time: '21:00' },
    { master_id: 'master-elena', day_of_week: 2, start_time: '16:00', end_time: '22:00' },
    { master_id: 'master-elena', day_of_week: 3, start_time: '16:00', end_time: '22:00' },
    { master_id: 'master-elena', day_of_week: 4, start_time: '16:00', end_time: '22:00' },
    { master_id: 'master-elena', day_of_week: 5, start_time: '16:00', end_time: '23:00' },
    { master_id: 'master-elena', day_of_week: 6, start_time: '11:00', end_time: '23:00' },
  ]
  
  for (const schedule of schedules) {
    const { error } = await supabase
      .from('master_schedules')
      .upsert({
        master_id: schedule.master_id,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_available: true,
      }, {
        onConflict: 'master_id,day_of_week,start_time'
      })
    
    if (error) {
      console.error(`❌ Error seeding schedule:`, error.message)
    }
  }
  
  console.log(`✅ ${schedules.length} Master schedules seeded\n`)
}

// ============================================
// Generate Time Slots
// ============================================
async function generateTimeSlots() {
  console.log('🌱 Generating time slots for all masters...')
  
  const masterIds = masters.map(m => m.id)
  
  for (const masterId of masterIds) {
    const { data, error } = await supabase.rpc('generate_master_time_slots', {
      p_master_id: masterId,
      p_days_ahead: 14
    })
    
    if (error) {
      console.error(`❌ Error generating time slots for ${masterId}:`, error.message)
    } else {
      console.log(`✅ Generated ${data} time slots for ${masterId}`)
    }
  }
  
  console.log('✅ Time slots generated\n')
}

// ============================================
// Main
// ============================================
async function main() {
  console.log('🚀 Starting database seed...\n')
  
  try {
    await seedMasters()
    await seedReviews()
    await seedMasterSchedules()
    await generateTimeSlots()
    
    console.log('🎉 Database seed completed successfully!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
