-- ============================================================
-- HobbyConnect: make post delete RLS robust for admins
-- ============================================================

DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;

CREATE POLICY "Admins can delete posts"
  ON public.posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
