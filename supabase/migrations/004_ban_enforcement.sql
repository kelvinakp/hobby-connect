-- Enforce bans at the database level and enable realtime on profiles.

-- 1. Messages: only non-banned users can insert messages.
DROP POLICY IF EXISTS "Non-banned users can send messages" ON messages;
CREATE POLICY "Non-banned users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.am_i_banned()
  );

-- 2. Hobbies: only non-banned users can create hobbies.
DROP POLICY IF EXISTS "Authenticated users can create hobbies" ON hobbies;
CREATE POLICY "Authenticated users can create hobbies"
  ON hobbies FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND NOT public.am_i_banned()
  );

-- 3. Interests: only non-banned users can express interest / join.
DROP POLICY IF EXISTS "Users can insert own interest" ON interests;
CREATE POLICY "Users can insert own interest"
  ON interests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.am_i_banned()
  );

-- 4. Realtime on profiles for ban changes.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

