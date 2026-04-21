-- ============================================================
-- HobbyConnect: Posts table for news/announcements with
-- admin review workflow for community leader submissions
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. POSTS (news / announcements — admin publishes directly,
--    moderator posts require admin review)
-- ---------------------------------------------------------------------------
CREATE TABLE public.posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  UUID REFERENCES public.hobbies(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
                  CHECK (status IN ('PUBLISHED', 'PENDING_REVIEW', 'REJECTED')),
  reviewed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- SELECT policies
-- ---------------------------------------------------------------------------

-- Everyone authenticated can read published posts
CREATE POLICY "Anyone can read published posts"
  ON public.posts FOR SELECT
  USING (status = 'PUBLISHED' AND auth.role() = 'authenticated');

-- Admins can read all posts (for review queue)
CREATE POLICY "Admins can read all posts"
  ON public.posts FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Authors can read their own posts (any status, to see pending/rejected)
CREATE POLICY "Authors can read own posts"
  ON public.posts FOR SELECT
  USING (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- INSERT policies
-- ---------------------------------------------------------------------------

-- Admins can create posts with any status (typically PUBLISHED)
CREATE POLICY "Admins can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND NOT public.am_i_banned()
    AND public.get_my_role() = 'admin'
  );

-- Moderators can create posts only as PENDING_REVIEW
CREATE POLICY "Moderators can create pending posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND NOT public.am_i_banned()
    AND status = 'PENDING_REVIEW'
    AND public.get_my_role() = 'moderator'
  );

-- ---------------------------------------------------------------------------
-- UPDATE policies
-- ---------------------------------------------------------------------------

-- Only admins can update post status (approve / reject)
CREATE POLICY "Admins can review posts"
  ON public.posts FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- DELETE policies
-- ---------------------------------------------------------------------------

-- Admins can delete any post
CREATE POLICY "Admins can delete posts"
  ON public.posts FOR DELETE
  USING (public.get_my_role() = 'admin');

-- Authors can delete their own pending/rejected posts
CREATE POLICY "Authors can delete own non-published posts"
  ON public.posts FOR DELETE
  USING (author_id = auth.uid() AND status != 'PUBLISHED');
