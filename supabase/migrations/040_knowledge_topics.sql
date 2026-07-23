-- Migration: Add Knowledge Topics tables for SEO/AEO content hub
-- Phase 1: Topics + Questions (no articles yet)

-- ============================================
-- Topics Table
-- ============================================
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_cn TEXT,
  description TEXT,
  description_cn TEXT,
  icon TEXT NOT NULL DEFAULT 'compass',
  sort_order INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Topics are publicly readable"
  ON topics FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- Knowledge Questions Table
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_slug TEXT NOT NULL REFERENCES topics(slug) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_cn TEXT,
  slug TEXT UNIQUE NOT NULL,
  answer TEXT,
  answer_cn TEXT,
  featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE knowledge_questions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Knowledge questions are publicly readable"
  ON knowledge_questions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_topic_slug 
  ON knowledge_questions(topic_slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_featured 
  ON knowledge_questions(featured);
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_slug 
  ON knowledge_questions(slug);

-- ============================================
-- Insert 9 Topics
-- ============================================
INSERT INTO topics (slug, name, name_cn, description, description_cn, icon, sort_order, featured) VALUES
  ('relationship', 'Relationship', '感情', 'Love, compatibility, and emotional guidance', '爱情、缘分与情感指引', 'heart', 1, true),
  ('career', 'Career', '事业', 'Career decisions, promotions, and professional growth', '职业选择、晋升与事业发展', 'briefcase', 2, true),
  ('wealth', 'Wealth', '财运', 'Financial fortune, investment timing, and wealth growth', '财富运势、投资时机与财运增长', 'coins', 3, true),
  ('home-feng-shui', 'Home Feng Shui', '家居风水', 'Home energy, space arrangement, and environmental harmony', '家居能量、空间布局与环境和谐', 'home', 4, true),
  ('life-direction', 'Life Direction', '人生方向', 'Life path, destiny, and personal purpose', '人生道路、命运与个人使命', 'compass', 5, true),
  ('marriage', 'Marriage', '婚姻', 'Marriage timing, compatibility, and relationship stability', '婚姻时机、配对与关系稳定', 'heart-handshake', 6, true),
  ('lost-items', 'Lost Items', '寻物', 'Finding lost objects, recovery timing, and location clues', '寻找失物、找回时机与位置线索', 'search', 7, true),
  ('pet-health', 'Pet Health', '宠物健康', 'Pet wellness, health predictions, and care guidance', '宠物健康、健康预测与护理指引', 'dog', 8, true),
  ('investment', 'Investment', '投资', 'Investment timing, market trends, and financial decisions', '投资时机、市场趋势与财务决策', 'trending-up', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Relationship
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('relationship', 'When will I meet my true love?', '我的正缘什么时候出现？', 'when-will-i-meet-my-true-love', true, 1),
  ('relationship', 'Is he/she the right person for me?', '他/她是对的人吗？', 'is-he-she-the-right-person', true, 2),
  ('relationship', 'Should I stay or leave this relationship?', '我应该继续还是离开这段关系？', 'should-i-stay-or-leave', true, 3),
  ('relationship', 'Can we fix our relationship?', '我们能修复这段关系吗？', 'can-we-fix-our-relationship', true, 4),
  ('relationship', 'Should I contact my ex?', '我应该联系前任吗？', 'should-i-contact-my-ex', false, 5),
  ('relationship', 'When is the best time to start dating?', '什么时候开始新的恋情最好？', 'when-to-start-dating', false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Career
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('career', 'Should I change my career path?', '我应该转行吗？', 'should-i-change-career', true, 1),
  ('career', 'Will I get a promotion this year?', '今年我会升职吗？', 'will-i-get-promotion', true, 2),
  ('career', 'Is this the right time to start a business?', '现在是创业的好时机吗？', 'right-time-to-start-business', true, 3),
  ('career', 'How can I advance in my current role?', '如何在现有职位上晋升？', 'how-to-advance-current-role', true, 4),
  ('career', 'Should I accept this job offer?', '我应该接受这份工作吗？', 'should-i-accept-job-offer', false, 5),
  ('career', 'What career suits me best?', '什么职业最适合我？', 'what-career-suits-me', false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Wealth
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('wealth', 'How is my wealth fortune trending?', '我的财运走势如何？', 'wealth-fortune-trend', true, 1),
  ('wealth', 'When will my financial situation improve?', '我的财务状况何时会好转？', 'when-will-finances-improve', true, 2),
  ('wealth', 'Should I make a major purchase now?', '我现在应该进行大额消费吗？', 'should-i-make-major-purchase', true, 3),
  ('wealth', 'How can I increase my income?', '如何增加我的收入？', 'how-to-increase-income', true, 4),
  ('wealth', 'Is this a good time to save or invest?', '现在是储蓄还是投资的好时机？', 'save-or-invest', false, 5),
  ('wealth', 'Will I have unexpected expenses?', '我会有意外开支吗？', 'unexpected-expenses', false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Home Feng Shui
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('home-feng-shui', 'How to adjust home feng shui for better luck?', '家里风水摆设如何调整提升运势？', 'adjust-home-feng-shui', true, 1),
  ('home-feng-shui', 'Which direction should my bed face?', '我的床应该朝哪个方向？', 'bed-direction', true, 2),
  ('home-feng-shui', 'Is my home layout affecting my energy?', '我的房屋布局影响我的能量吗？', 'home-layout-energy', true, 3),
  ('home-feng-shui', 'How to arrange my workspace for success?', '如何布置我的工作空间以利事业？', 'workspace-arrangement', true, 4),
  ('home-feng-shui', 'What colors should I use in my home?', '我家应该用什么颜色？', 'home-colors', false, 5),
  ('home-feng-shui', 'Is there negative energy in my home?', '我家里有负能量吗？', 'negative-energy-home', false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Life Direction
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('life-direction', 'Am I on the right life path?', '我走在正确的人生道路上吗？', 'am-i-on-right-path', true, 1),
  ('life-direction', 'What is my life purpose?', '我的人生使命是什么？', 'what-is-my-life-purpose', true, 2),
  ('life-direction', 'Should I move to a new city?', '我应该搬到新城市吗？', 'should-i-move-city', true, 3),
  ('life-direction', 'What is my life trajectory for the next decade?', '我未来十年的人生走势如何？', 'next-decade-trajectory', true, 4),
  ('life-direction', 'How can I find my true calling?', '如何找到我的真正使命？', 'find-true-calling', false, 5),
  ('life-direction', 'Am I making the right life decisions?', '我在做正确的人生决定吗？', 'right-life-decisions', false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Marriage
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('marriage', 'Will my marriage go smoothly?', '我的婚姻会顺利吗？', 'will-marriage-go-smoothly', true, 1),
  ('marriage', 'When is the best time to get married?', '什么时候结婚最好？', 'best-time-to-marry', true, 2),
  ('marriage', 'Are we compatible for marriage?', '我们适合结婚吗？', 'are-we-compatible-marriage', true, 3),
  ('marriage', 'How can I improve my marriage?', '如何改善我的婚姻？', 'how-to-improve-marriage', true, 4),
  ('marriage', 'Will I have a happy marriage?', '我会拥有幸福的婚姻吗？', 'happy-marriage', false, 5),
  ('marriage', 'Should I get married now or wait?', '我现在应该结婚还是等待？', 'marry-now-or-wait', false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Lost Items
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('lost-items', 'Can I find my lost items?', '我丢失的物品能找到吗？', 'can-i-find-lost-items', true, 1),
  ('lost-items', 'Where should I look for my lost item?', '我应该在哪里寻找丢失的物品？', 'where-to-look-lost-item', true, 2),
  ('lost-items', 'Will my lost item be returned?', '我丢失的物品会被归还吗？', 'will-lost-item-be-returned', true, 3),
  ('lost-items', 'When will I find my lost item?', '我什么时候能找到丢失的物品？', 'when-find-lost-item', true, 4),
  ('lost-items', 'Is my lost item still recoverable?', '我丢失的物品还能找回吗？', 'is-lost-item-recoverable', false, 5),
  ('lost-items', 'Who took my lost item?', '谁拿了我的丢失物品？', 'who-took-lost-item', false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Pet Health
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('pet-health', 'How is my pet''s health?', '我的宠物健康状况如何？', 'how-is-my-pets-health', true, 1),
  ('pet-health', 'Will my pet recover from illness?', '我的宠物会从疾病中康复吗？', 'will-pet-recover', true, 2),
  ('pet-health', 'Should I be worried about my pet''s behavior?', '我应该担心宠物的行为吗？', 'worried-about-pet-behavior', true, 3),
  ('pet-health', 'When is the best time to get a new pet?', '什么时候养新宠物最好？', 'best-time-new-pet', true, 4),
  ('pet-health', 'How can I improve my pet''s wellbeing?', '如何改善宠物的健康状况？', 'improve-pet-wellbeing', false, 5),
  ('pet-health', 'Will my pet live a long life?', '我的宠物会长寿吗？', 'will-pet-live-long', false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Questions for Investment
-- ============================================
INSERT INTO knowledge_questions (topic_slug, question, question_cn, slug, featured, sort_order) VALUES
  ('investment', 'Is this a good time to invest?', '现在是投资的好时机吗？', 'good-time-to-invest', true, 1),
  ('investment', 'What investment suits my fortune?', '什么投资适合我的财运？', 'investment-suits-fortune', true, 2),
  ('investment', 'Should I invest in property now?', '我现在应该投资房产吗？', 'invest-in-property', true, 3),
  ('investment', 'Will my investment be profitable?', '我的投资会有收益吗？', 'will-investment-profit', true, 4),
  ('investment', 'Should I invest in stocks or real estate?', '我应该投资股票还是房地产？', 'stocks-or-real-estate', false, 5),
  ('investment', 'When will I see returns on my investment?', '我什么时候能看到投资回报？', 'when-see-returns', false, 6)
ON CONFLICT (slug) DO NOTHING;
