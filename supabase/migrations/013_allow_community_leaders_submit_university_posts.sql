-- Allow community leaders (hobby creators) to submit pending posts
-- only inside communities they created.
DROP POLICY IF EXISTS "Community creators can create pending posts" ON public.posts;
DROP POLICY IF EXISTS "Community leaders can create pending posts" ON public.posts;

CREATE POLICY "Community leaders can create pending posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND NOT public.am_i_banned()
    AND status = 'PENDING_REVIEW'
    AND community_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.hobbies h
      WHERE h.id = posts.community_id
        AND h.created_by = auth.uid()
    )
  );
