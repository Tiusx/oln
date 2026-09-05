-- 0004_moments.sql
-- Moments (朋友圈 / 说说) table: short status updates on a timeline

CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  content_html TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
);
CREATE INDEX IF NOT EXISTS idx_moments_status ON moments(status);
CREATE INDEX IF NOT EXISTS idx_moments_created ON moments(created_at);