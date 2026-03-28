-- Chuhai Database Seed Script
-- 初始化数据库静态数据

-- =====================================================
-- 1. Seed Services
-- =====================================================

INSERT INTO services (id, type, name_en, name_zh, slug, description, short_description, price_min, price_max, duration_minutes, features, requirements, sort_order, is_active, image_url) VALUES
('tarot-quick', 'tarot', 'Quick Tarot Reading', '快速塔罗解读', 'tarot-quick', 'Get quick insights on a specific question with a 3-card spread. Perfect for daily guidance or when you need clarity fast.', '3-card spread for quick insights', 15, 15, 10, '[{"icon":"clock","title":"10 Minutes","description":"Quick but meaningful session"},{"icon":"cards","title":"3-Card Spread","description":"Past, Present, Future"},{"icon":"message","title":"Written Summary","description":"Keep your insights forever"}]', '["Your specific question","Optional: Context about your situation"]', 1, true, '/images/tarot-quick.jpg'),
('tarot-deep', 'tarot', 'Deep Tarot Reading', '深度塔罗解读', 'tarot-deep', 'A comprehensive 20-minute session with Celtic Cross spread for deep insights into complex situations. Our most popular service.', 'Celtic Cross spread for deep insights', 25, 25, 20, '[{"icon":"clock","title":"20 Minutes","description":"In-depth exploration"},{"icon":"cards","title":"Celtic Cross","description":"10-card comprehensive spread"},{"icon":"video","title":"Video Session","description":"Face-to-face with your reader"},{"icon":"document","title":"Detailed Report","description":"PDF with card meanings"}]', '["Your specific question or area of focus","Optional: Birth date for additional insights"]', 2, true, '/images/tarot-deep.jpg'),
('astrology-natal', 'astrology', 'Natal Chart Reading', '出生星盘解读', 'astrology-natal', 'Discover your cosmic blueprint with a personalized birth chart analysis. Understand your personality, strengths, and life path.', 'Personalized birth chart analysis', 45, 55, 35, '[{"icon":"star","title":"Complete Chart","description":"Sun, Moon, Rising & more"},{"icon":"video","title":"Video Session","description":"Interactive consultation"},{"icon":"document","title":"Birth Chart PDF","description":"Your complete chart"},{"icon":"calendar","title":"12-Month Forecast","description":"Key dates ahead"}]', '["Exact birth date","Exact birth time","Birth location (city, country)"]', 3, true, '/images/astrology-natal.jpg'),
('bazi-basic', 'bazi', 'Bazi Life Reading', '八字命盘分析', 'bazi-basic', 'Unlock the secrets of your destiny with authentic Chinese Four Pillars astrology. Understand your life path, strengths, and opportunities.', 'Chinese Four Pillars astrology', 60, 60, 45, '[{"icon":"scroll","title":"Complete Analysis","description":"Day, Month, Year, Hour pillars"},{"icon":"balance","title":"Five Elements","description":"Your elemental balance"},{"icon":"video","title":"Video Session","description":"Personal consultation"},{"icon":"document","title":"Detailed Report","description":"Written analysis included"}]', '["Exact birth date","Exact birth time","Birth location","Gender"]', 4, true, '/images/bazi-basic.jpg'),
('fengshui-home', 'fengshui', 'Home Feng Shui Consultation', '家居风水咨询', 'fengshui-home', 'Transform your living space with ancient Feng Shui wisdom. Optimize your home''s energy flow for health, wealth, and relationships.', 'Optimize your home''s energy flow', 120, 150, 60, '[{"icon":"home","title":"Space Analysis","description":"Room-by-room assessment"},{"icon":"compass","title":"Bagua Mapping","description":"Energy center identification"},{"icon":"video","title":"Video Walkthrough","description":"Guided consultation"},{"icon":"document","title":"Action Plan","description":"Step-by-step recommendations"}]', '["Floor plan or video tour of your home","Birth dates of residents","Specific areas of concern"]', 5, true, '/images/fengshui-home.jpg'),
('qimen-timing', 'qimen', 'Qi Men Dun Jia - Timing Analysis', '奇门遁甲 - 择时决策', 'qimen-timing', 'Harness the ancient Chinese art of Qi Men Dun Jia to determine the most auspicious timing for important decisions, business ventures, investments, and life events.', 'Strategic timing for success', 80, 100, 40, '[{"icon":"clock","title":"Timing Analysis","description":"Best dates and hours for action"},{"icon":"map","title":"Directional Energy","description":"Optimal directions for success"},{"icon":"compass","title":"Strategic Guidance","description":"Hidden opportunities revealed"},{"icon":"document","title":"Written Report","description":"Detailed timing recommendations"}]', '["Your specific goal or decision","Proposed timeframe","Birth date for personalization"]', 6, true, '/images/qimen-timing.jpg'),
('liuyao-divination', 'liuyao', 'Liu Yao Divination', '六爻占卜', 'liuyao-divination', 'Consult the ancient Chinese Liu Yao (Six Lines) divination system for precise answers to specific questions about relationships, career, investments, and life decisions.', 'Precise answers to your questions', 45, 55, 30, '[{"icon":"coins","title":"Coin Casting","description":"Traditional casting method"},{"icon":"scroll","title":"Hexagram Reading","description":"Six-line analysis"},{"icon":"balance","title":"Yes/No Clarity","description":"Clear direction for decisions"},{"icon":"video","title":"Video Session","description":"Interactive consultation"}]', '["One specific question","Context about your situation","Optional: Birth date"]', 7, true, '/images/liuyao-divination.jpg')
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  price_min = EXCLUDED.price_min,
  price_max = EXCLUDED.price_max,
  duration_minutes = EXCLUDED.duration_minutes,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 2. Seed Masters
-- =====================================================

-- 注意: masters 表需要先有对应的 user_id 在 profiles 表中
-- 这里我们假设这些用户已经通过 auth.users 创建

INSERT INTO masters (id, user_id, display_name, tagline, bio, avatar_url, specialties, languages, experience_years, certifications, is_verified, verification_status, base_price_tier, rating_average, rating_count, completed_sessions, timezone, is_active) VALUES
('zhang-yihua', 'user-zhang-yihua', 'Master Zhang Yihua', 'Revealing the unseen patterns of timing and destiny', 'Master Zhang Yihua has 8 years of professional experience in Chinese metaphysics and traditional divination. He specializes in Qi Men Dun Jia and Liu Yao divination, two ancient systems used to analyze timing, opportunities, and hidden influences in life events.', '/masters/master_zhang_yihua.jpg', ARRAY['qimen', 'liuyao'], ARRAY['en', 'zh'], 8, '[{"name":"Qi Men Dun Jia Practitioner","issuer":"Chinese Metaphysics Institute","year":2018},{"name":"Liu Yao Divination Certificate","issuer":"Traditional Divination Association","year":2019}]'::jsonb, true, 'approved', 'standard', 4.9, 156, 680, 'Asia/Shanghai', true),
('wu-yang', 'user-wu-yang', 'Master Wu Yang', 'Align your path with the flow of cosmic energy', 'Master Wu Yang has over 12 years of experience practicing Chinese metaphysics. He focuses on BaZi (Four Pillars of Destiny) analysis and Feng Shui consultation.', '/masters/master_wu_yang.jpg', ARRAY['bazi', 'fengshui'], ARRAY['en', 'zh'], 12, '[{"name":"Certified BaZi Master","issuer":"International Chinese Metaphysics Association","year":2015},{"name":"Feng Shui Consultant Certificate","issuer":"Asian Feng Shui Guild","year":2017}]'::jsonb, true, 'approved', 'premium', 4.9, 248, 1120, 'Asia/Shanghai', true),
('master-luna', 'user-master-luna', 'Master Luna', 'Seeing what your heart already knows, and what lies ahead', 'I use tarot as a mirror to reveal what is hidden beneath the surface — your emotions, your patterns, and the energy surrounding your path.', '/masters/master_luna.jpg', ARRAY['tarot'], ARRAY['en'], 10, '[{"name":"Certified Tarot Reader","issuer":"Tarot Certification Board","year":2022}]'::jsonb, true, 'approved', 'standard', 4.9, 312, 850, 'America/Los_Angeles', true),
('master-lin', 'user-master-lin', 'Master Lin', 'Clarity, balance, and direction for your life path', 'I specialize in helping you understand the deeper structure of your life — your strengths, timing, and opportunities. Through Bazi and Feng Shui, I provide practical and grounded insights.', '/masters/master_lin.jpg', ARRAY['bazi', 'fengshui'], ARRAY['en', 'zh'], 10, '[{"name":"Certified BaZi Master","issuer":"Chinese Metaphysics Institute","year":2016},{"name":"Feng Shui Practitioner","issuer":"International Feng Shui Association","year":2018}]'::jsonb, true, 'approved', 'standard', 4.8, 328, 920, 'Asia/Shanghai', true),
('master-han', 'user-master-han', 'Master Han', 'Clear guidance, in a way that feels simple and personal', 'I believe that understanding your life path shouldn''t feel complicated or distant. My readings focus on making Bazi simple, clear, and directly useful for your everyday decisions.', '/masters/master_han.jpg', ARRAY['bazi'], ARRAY['en', 'zh'], 6, '[{"name":"BaZi Divination Certificate","issuer":"Traditional Chinese Metaphysics Association","year":2020}]'::jsonb, true, 'approved', 'standard', 4.7, 172, 540, 'Asia/Shanghai', true),
('master-elena', 'user-master-elena', 'Master Elena', 'Insight, clarity, and emotional truth through tarot', 'I use tarot to help you understand what you''re feeling, what the other person feels, and where things are heading.', '/masters/master_elena.jpg', ARRAY['tarot'], ARRAY['en'], 7, '[{"name":"Certified Tarot Reader","issuer":"Tarot Certification Board","year":2019},{"name":"Relationship Counseling Diploma","issuer":"Institute of Intuitive Studies","year":2021}]'::jsonb, true, 'approved', 'standard', 4.7, 301, 780, 'America/Los_Angeles', true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  tagline = EXCLUDED.tagline,
  bio = EXCLUDED.bio,
  specialties = EXCLUDED.specialties,
  experience_years = EXCLUDED.experience_years,
  rating_average = EXCLUDED.rating_average,
  rating_count = EXCLUDED.rating_count,
  completed_sessions = EXCLUDED.completed_sessions,
  updated_at = NOW();

-- =====================================================
-- 3. Seed Master Schedules (周排班)
-- =====================================================

INSERT INTO master_schedules (master_id, day_of_week, start_time, end_time, is_available) VALUES
-- Master Zhang Yihua
('zhang-yihua', 0, '09:00', '18:00', true),
('zhang-yihua', 1, '09:00', '18:00', true),
('zhang-yihua', 2, '09:00', '18:00', true),
('zhang-yihua', 3, '09:00', '18:00', true),
('zhang-yihua', 4, '09:00', '18:00', true),
('zhang-yihua', 5, '10:00', '16:00', true),
('zhang-yihua', 6, '10:00', '16:00', true),
-- Master Wu Yang
('wu-yang', 1, '10:00', '19:00', true),
('wu-yang', 2, '10:00', '19:00', true),
('wu-yang', 3, '10:00', '19:00', true),
('wu-yang', 4, '10:00', '19:00', true),
('wu-yang', 5, '10:00', '17:00', true),
-- Master Luna
('master-luna', 0, '10:00', '20:00', true),
('master-luna', 1, '18:00', '22:00', true),
('master-luna', 2, '18:00', '22:00', true),
('master-luna', 3, '18:00', '22:00', true),
('master-luna', 4, '18:00', '22:00', true),
('master-luna', 5, '18:00', '23:00', true),
('master-luna', 6, '10:00', '23:00', true),
-- Master Lin
('master-lin', 0, '09:00', '17:00', true),
('master-lin', 1, '09:00', '17:00', true),
('master-lin', 2, '09:00', '17:00', true),
('master-lin', 3, '09:00', '17:00', true),
('master-lin', 4, '09:00', '17:00', true),
('master-lin', 5, '10:00', '15:00', true),
-- Master Han
('master-han', 1, '14:00', '21:00', true),
('master-han', 2, '14:00', '21:00', true),
('master-han', 3, '14:00', '21:00', true),
('master-han', 4, '14:00', '21:00', true),
('master-han', 5, '14:00', '20:00', true),
('master-han', 6, '10:00', '18:00', true),
-- Master Elena
('master-elena', 0, '11:00', '21:00', true),
('master-elena', 2, '16:00', '22:00', true),
('master-elena', 3, '16:00', '22:00', true),
('master-elena', 4, '16:00', '22:00', true),
('master-elena', 5, '16:00', '23:00', true),
('master-elena', 6, '11:00', '23:00', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. 生成时间格 (未来14天)
-- =====================================================

-- 为每个师傅生成时间格
DO $$
DECLARE
  v_master RECORD;
BEGIN
  FOR v_master IN SELECT id FROM masters WHERE is_active = true LOOP
    PERFORM generate_master_time_slots(v_master.id, 14);
  END LOOP;
END $$;

-- =====================================================
-- 5. 查看生成结果
-- =====================================================

SELECT 'Services count: ' || COUNT(*)::text as status FROM services
UNION ALL
SELECT 'Masters count: ' || COUNT(*)::text FROM masters
UNION ALL
SELECT 'Master schedules count: ' || COUNT(*)::text FROM master_schedules
UNION ALL
SELECT 'Time slots count: ' || COUNT(*)::text FROM master_time_slots;
