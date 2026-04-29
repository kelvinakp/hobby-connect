-- Allow all authenticated users to view any profile and profile details.
-- University context: students should be able to see each other's details.

-- ── profiles ──
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators read all profiles" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;

CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── user_skills ──
-- The existing "Users manage own skills" (FOR ALL) only lets owners read.
-- Add a separate SELECT policy so everyone can see each other's skills.
DROP POLICY IF EXISTS "Authenticated users can read all skills" ON user_skills;
CREATE POLICY "Authenticated users can read all skills"
  ON user_skills FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── profile_hobbies ──
-- Same issue: the existing FOR ALL policy only lets owners read.
DROP POLICY IF EXISTS "Authenticated users can read all hobbies" ON profile_hobbies;
CREATE POLICY "Authenticated users can read all hobbies"
  ON profile_hobbies FOR SELECT
  USING (auth.role() = 'authenticated');
