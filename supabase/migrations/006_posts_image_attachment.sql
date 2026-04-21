-- ============================================================
-- HobbyConnect: optional image attachment for posts
-- Stored in DB as data URL with strict size cap
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS image_data TEXT,
  ADD COLUMN IF NOT EXISTS image_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS image_size_bytes INT;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_image_size_limit
  CHECK (
    image_size_bytes IS NULL
    OR (image_size_bytes >= 0 AND image_size_bytes <= 512000)
  );

ALTER TABLE public.posts
  ADD CONSTRAINT posts_image_consistency
  CHECK (
    (image_data IS NULL AND image_mime_type IS NULL AND image_size_bytes IS NULL)
    OR (image_data IS NOT NULL AND image_mime_type IS NOT NULL AND image_size_bytes IS NOT NULL)
  );
