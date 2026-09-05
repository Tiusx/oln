-- 0005_pages_comments_enabled.sql
-- Per-page comment toggle (whether comments are enabled for this page)

ALTER TABLE pages ADD COLUMN comments_enabled INTEGER NOT NULL DEFAULT 1;