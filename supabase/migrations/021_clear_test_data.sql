-- 2026-05-19: 清空测试订单数据（alpha测试前）
-- 备份文档: https://www.feishu.cn/docx/Xk0vd9x2BoLOEZxPElucWSADnPh

-- 1. 先删关联的 messages
DELETE FROM messages;

-- 2. 再删 bookings
DELETE FROM bookings;

-- 3. 重置序列（如果需要）
-- ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
