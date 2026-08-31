-- 0002_drop_messages.sql
-- Remove the self-hosted message board table (now handled by Waline)

DROP TABLE IF EXISTS messages;
DROP INDEX IF EXISTS idx_messages_status;
