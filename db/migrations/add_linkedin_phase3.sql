-- Migration: LinkedIn Automation Phase 3 updates
-- Run this in your Supabase SQL editor
-- Date: 2026-03-07
-- Purpose: Add 'trailer' strategy to linkedin_posts constraint and create config table

-- =======================================================
-- UPDATE: Add 'trailer' to strategy check constraint
-- =======================================================
ALTER TABLE linkedin_posts
DROP CONSTRAINT IF EXISTS linkedin_posts_strategy_check;

ALTER TABLE linkedin_posts
ADD CONSTRAINT linkedin_posts_strategy_check
CHECK (strategy IS NULL OR strategy IN ('daily_digest', 'top_story', 'multi_post', 'deals_roundup', 'trailer'));

-- =======================================================
-- TABLE: linkedin_config (persistent config, future use)
-- =======================================================
CREATE TABLE IF NOT EXISTS linkedin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE linkedin_config IS 'Key-value config store for LinkedIn automation settings';
