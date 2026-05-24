-- 2026-05-19: messages 表添加 source 字段，区分实时聊天和跟进消息
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'chat';

-- 给现有数据打标签（师傅发的消息 = follow_up）
UPDATE messages SET source = 'follow_up' WHERE sender_type = 'master';
UPDATE messages SET source = 'chat' WHERE sender_type = 'user';
