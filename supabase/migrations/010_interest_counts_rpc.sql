-- ============================================================
-- HobbyConnect: efficient member counts per hobby
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_interest_counts(hobby_ids uuid[])
RETURNS TABLE (hobby_id uuid, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.hobby_id, COUNT(*)::bigint AS member_count
  FROM public.interests i
  WHERE i.hobby_id = ANY(hobby_ids)
  GROUP BY i.hobby_id;
$$;

REVOKE ALL ON FUNCTION public.get_interest_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_interest_counts(uuid[]) TO authenticated;
