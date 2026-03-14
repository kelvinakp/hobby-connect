-- ============================================================
-- HobbyConnect: 3NF-ready schema for Supabase (run on fresh DB)
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES (no JSONB arrays; full_name derived in app or view)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id         TEXT,
  first_name         TEXT,
  last_name          TEXT,
  email              TEXT,
  bio                TEXT,
  major              TEXT,
  avatar_url         TEXT,
  role               TEXT NOT NULL DEFAULT 'user',
  is_banned          BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Moderator helpers (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT role FROM profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.am_i_banned()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT COALESCE((SELECT is_banned FROM profiles WHERE id = auth.uid()), FALSE); $$;

CREATE POLICY "Moderators read all profiles"
  ON profiles FOR SELECT
  USING (public.get_my_role() IN ('moderator', 'admin'));

CREATE POLICY "Moderators update any profile"
  ON profiles FOR UPDATE
  USING (public.get_my_role() IN ('moderator', 'admin'));

-- ---------------------------------------------------------------------------
-- 2. USER SKILLS (normalized: one row per skill per user)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('noob', 'skilled', 'pro')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, category)
);

CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own skills"
  ON user_skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. PROFILE HOBBIES (normalized: one row per hobby name per user)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profile_hobbies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hobby_name TEXT NOT NULL,
  UNIQUE (user_id, hobby_name)
);

CREATE INDEX idx_profile_hobbies_user_id ON profile_hobbies(user_id);

ALTER TABLE profile_hobbies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile_hobbies"
  ON profile_hobbies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. HOBBIES (communities)
-- ---------------------------------------------------------------------------
CREATE TABLE public.hobbies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hobbies_created_by ON hobbies(created_by);
CREATE INDEX idx_hobbies_category ON hobbies(category);
CREATE INDEX idx_hobbies_created_at ON hobbies(created_at);

ALTER TABLE hobbies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read hobbies"
  ON hobbies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create hobbies"
  ON hobbies FOR INSERT
  WITH CHECK (auth.uid() = created_by AND NOT public.am_i_banned());

CREATE POLICY "Creator can update own hobby"
  ON hobbies FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can delete own hobby"
  ON hobbies FOR DELETE
  USING (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. INTERESTS (user joined / interested in hobby)
-- ---------------------------------------------------------------------------
CREATE TABLE public.interests (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hobby_id  UUID NOT NULL REFERENCES public.hobbies(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (hobby_id, user_id)
);

CREATE INDEX idx_interests_hobby_id ON interests(hobby_id);
CREATE INDEX idx_interests_user_id ON interests(user_id);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own interest"
  ON interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own interests"
  ON interests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Creators read interests on their hobbies"
  ON interests FOR SELECT
  USING (
    hobby_id IN (SELECT id FROM public.hobbies WHERE created_by = auth.uid())
  );

CREATE POLICY "Users delete own interest"
  ON interests FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. MESSAGES (community_id = hobby_id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.hobbies(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_community_id ON messages(community_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read messages"
  ON messages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Non-banned users send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT public.am_i_banned());

CREATE POLICY "Hobby creator or global mod delete messages"
  ON messages FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM hobbies WHERE id = messages.community_id AND created_by = auth.uid())
    OR public.get_my_role() IN ('moderator', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 7. EVENTS (community_id = hobby_id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id   UUID NOT NULL REFERENCES public.hobbies(id) ON DELETE CASCADE,
  creator_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  location       TEXT NOT NULL,
  event_date     TIMESTAMPTZ NOT NULL,
  capacity       INT NOT NULL,
  required_skill TEXT NOT NULL CHECK (required_skill IN ('beginner', 'intermediate', 'advanced')),
  status         TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_community_id ON events(community_id);
CREATE INDEX idx_events_event_date ON events(event_date);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read events"
  ON events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Hobby creator or global mod create events"
  ON events FOR INSERT
  WITH CHECK (
    NOT public.am_i_banned()
    AND (
      EXISTS (SELECT 1 FROM hobbies WHERE id = events.community_id AND created_by = auth.uid())
      OR public.get_my_role() IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Hobby creator or global mod update events"
  ON events FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM hobbies WHERE id = events.community_id AND created_by = auth.uid())
    OR public.get_my_role() IN ('moderator', 'admin')
  );

CREATE POLICY "Hobby creator or global mod delete events"
  ON events FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM hobbies WHERE id = events.community_id AND created_by = auth.uid())
    OR public.get_my_role() IN ('moderator', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 8. REALTIME
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE interests;

-- ---------------------------------------------------------------------------
-- 9. AUTO-CREATE PROFILE ON SIGNUP (Supabase Auth trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'email',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

