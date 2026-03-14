-- Allow both 'moderator' and 'admin' roles to view all profiles and update (ban) users.
-- Ensures RLS permits admin role the same dashboard actions as moderator.

DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
CREATE POLICY "Moderators can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.get_my_role() IN ('moderator', 'admin')
  );

DROP POLICY IF EXISTS "Moderators can ban users" ON profiles;
CREATE POLICY "Moderators can ban users"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR public.get_my_role() IN ('moderator', 'admin')
  );
