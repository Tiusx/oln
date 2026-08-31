-- 0003_post_comments_enabled.sql
-- Add per-post comment toggle (whether comments are enabled for this post)

ALTER TABLE posts ADD COLUMN comments_enabled INTEGER NOT NULL DEFAULT 1;
