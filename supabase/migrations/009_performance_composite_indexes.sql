-- ============================================================
-- HobbyConnect: performance composite indexes for hot queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_messages_community_created_at
  ON public.messages(community_id, created_at);

CREATE INDEX IF NOT EXISTS idx_posts_status_created_at
  ON public.posts(status, created_at);

CREATE INDEX IF NOT EXISTS idx_events_community_event_date
  ON public.events(community_id, event_date);
