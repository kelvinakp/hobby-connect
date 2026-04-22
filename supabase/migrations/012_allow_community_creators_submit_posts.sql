-- Allow community creators to submit posts for review in their own communities.
CREATE POLICY "Community creators can create pending posts"
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
