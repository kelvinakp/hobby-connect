-- Allow users to insert their own profile row (for upsert when row doesn't exist yet).
-- Fixes: "new row violates row-level security policy for table \"profiles\""

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
