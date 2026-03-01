-- Migration: Add LinkedIn automation tracking tables
-- Run this in your Supabase SQL editor
-- Date: 2026-02-28
-- Purpose: Track LinkedIn post status and event logs for OpenClaw automation

-- =======================================================
-- TABLE: linkedin_posts
-- =======================================================
-- Tracks the status of LinkedIn posts for each newsletter
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_date DATE NOT NULL UNIQUE, -- References newsletters.publication_date
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'posted', 'failed', 'skipped'
  strategy TEXT, -- 'daily_digest', 'top_story', 'multi_post', 'deals_roundup'
  linkedin_post_id TEXT, -- LinkedIn's post ID (e.g., urn:li:ugcPost:123456)
  linkedin_url TEXT, -- Direct link to posted content on LinkedIn
  post_text TEXT, -- Final formatted text that was posted
  character_count INTEGER, -- Length of post_text (for analytics)
  posted_at TIMESTAMPTZ, -- When the post was successfully published
  error_message TEXT, -- Error details if status is 'failed'
  retry_count INTEGER DEFAULT 0, -- Number of posting attempts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for linkedin_posts
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_date ON linkedin_posts(newsletter_date DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_status ON linkedin_posts(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_created_at ON linkedin_posts(created_at DESC);

-- Add check constraint for valid status values
ALTER TABLE linkedin_posts
DROP CONSTRAINT IF EXISTS linkedin_posts_status_check;

ALTER TABLE linkedin_posts
ADD CONSTRAINT linkedin_posts_status_check
CHECK (status IN ('pending', 'posted', 'failed', 'skipped'));

-- Add check constraint for valid strategy values
ALTER TABLE linkedin_posts
DROP CONSTRAINT IF EXISTS linkedin_posts_strategy_check;

ALTER TABLE linkedin_posts
ADD CONSTRAINT linkedin_posts_strategy_check
CHECK (strategy IS NULL OR strategy IN ('daily_digest', 'top_story', 'multi_post', 'deals_roundup'));

-- =======================================================
-- TABLE: linkedin_logs
-- =======================================================
-- Event logs for debugging and monitoring the LinkedIn automation
CREATE TABLE IF NOT EXISTS linkedin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_date DATE NOT NULL, -- References newsletters.publication_date
  event_type TEXT NOT NULL, -- 'webhook_received', 'content_fetched', 'post_attempted', 'post_success', 'post_failed'
  message TEXT, -- Human-readable event description
  metadata JSONB, -- Additional context (error details, timing, HTTP status codes, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for linkedin_logs
CREATE INDEX IF NOT EXISTS idx_linkedin_logs_date ON linkedin_logs(newsletter_date DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_logs_event ON linkedin_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_linkedin_logs_created_at ON linkedin_logs(created_at DESC);

-- Add check constraint for valid event types
ALTER TABLE linkedin_logs
DROP CONSTRAINT IF EXISTS linkedin_logs_event_type_check;

ALTER TABLE linkedin_logs
ADD CONSTRAINT linkedin_logs_event_type_check
CHECK (event_type IN (
  'webhook_received',
  'webhook_failed',
  'content_fetched',
  'content_fetch_failed',
  'strategy_decided',
  'post_attempted',
  'post_success',
  'post_failed',
  'retry_scheduled',
  'manual_skip'
));

-- =======================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =======================================================
CREATE OR REPLACE FUNCTION update_linkedin_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_linkedin_posts_updated_at ON linkedin_posts;

CREATE TRIGGER trigger_linkedin_posts_updated_at
BEFORE UPDATE ON linkedin_posts
FOR EACH ROW
EXECUTE FUNCTION update_linkedin_posts_updated_at();

-- =======================================================
-- ROW LEVEL SECURITY (Optional - enable if needed)
-- =======================================================
-- Uncomment if you want to enable RLS for these tables
-- ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE linkedin_logs ENABLE ROW LEVEL SECURITY;

-- =======================================================
-- COMMENTS (for documentation)
-- =======================================================
COMMENT ON TABLE linkedin_posts IS 'Tracks LinkedIn posting status for each newsletter';
COMMENT ON TABLE linkedin_logs IS 'Event logs for debugging LinkedIn automation';

COMMENT ON COLUMN linkedin_posts.newsletter_date IS 'Date of the newsletter (YYYY-MM-DD)';
COMMENT ON COLUMN linkedin_posts.status IS 'Current posting status: pending, posted, failed, or skipped';
COMMENT ON COLUMN linkedin_posts.strategy IS 'Posting strategy used: daily_digest, top_story, multi_post, or deals_roundup';
COMMENT ON COLUMN linkedin_posts.linkedin_post_id IS 'LinkedIn URN or post ID returned by API';
COMMENT ON COLUMN linkedin_posts.linkedin_url IS 'Direct URL to the LinkedIn post';
COMMENT ON COLUMN linkedin_posts.retry_count IS 'Number of times posting was attempted';

COMMENT ON COLUMN linkedin_logs.event_type IS 'Type of event: webhook_received, content_fetched, post_attempted, etc.';
COMMENT ON COLUMN linkedin_logs.metadata IS 'JSON object with additional event context';

-- =======================================================
-- SAMPLE QUERIES (for reference)
-- =======================================================

-- Check recent posting status
-- SELECT newsletter_date, status, strategy, posted_at, error_message
-- FROM linkedin_posts
-- ORDER BY newsletter_date DESC
-- LIMIT 10;

-- View success rate over last 30 days
-- SELECT
--   COUNT(*) AS total_attempts,
--   SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) AS successful,
--   ROUND(100.0 * SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate_pct
-- FROM linkedin_posts
-- WHERE created_at >= NOW() - INTERVAL '30 days';

-- View event logs for a specific date
-- SELECT created_at, event_type, message, metadata
-- FROM linkedin_logs
-- WHERE newsletter_date = '2026-02-28'
-- ORDER BY created_at;

-- Find failed posts with error details
-- SELECT newsletter_date, error_message, retry_count, created_at
-- FROM linkedin_posts
-- WHERE status = 'failed'
-- ORDER BY created_at DESC;
