-- ============================================================
-- HobbyConnect: move post images from DB base64 to Storage URLs
-- ============================================================

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_image_consistency;

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_image_size_limit;

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_image_storage_consistency;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS image_size_bytes INT;

-- Legacy rows may still have old DB-image metadata. Since we are intentionally
-- dropping base64 image support without backfill, clear metadata unless the new
-- storage path/url pair is present.
UPDATE public.posts
SET
  image_path = NULL,
  image_url = NULL,
  image_mime_type = NULL,
  image_size_bytes = NULL
WHERE image_path IS NULL OR image_url IS NULL;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_image_size_limit
  CHECK (
    image_size_bytes IS NULL
    OR (image_size_bytes >= 0 AND image_size_bytes <= 512000)
  );

ALTER TABLE public.posts
  ADD CONSTRAINT posts_image_storage_consistency
  CHECK (
    (image_path IS NULL AND image_url IS NULL AND image_mime_type IS NULL AND image_size_bytes IS NULL)
    OR (image_path IS NOT NULL AND image_url IS NOT NULL AND image_mime_type IS NOT NULL AND image_size_bytes IS NOT NULL)
  );

ALTER TABLE public.posts
  DROP COLUMN IF EXISTS image_data;
