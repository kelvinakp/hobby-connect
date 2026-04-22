-- ============================================================
-- HobbyConnect: include full old row on interests DELETE realtime
-- Needed for leave notifications (user_id + hobby_id in payload.old)
-- ============================================================

ALTER TABLE public.interests REPLICA IDENTITY FULL;
