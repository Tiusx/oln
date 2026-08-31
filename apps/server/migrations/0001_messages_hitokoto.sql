-- 0001_messages_hitokoto.sql
-- Message board (留言板) and Hitokoto (一言) tables

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

CREATE TABLE IF NOT EXISTS hitokoto (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  creator TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);
