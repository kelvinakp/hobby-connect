-- Public profile metadata and social links

CREATE TABLE IF NOT EXISTS public.public_profile_meta (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.public_profile_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profile meta"
  ON public.public_profile_meta FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users manage own profile meta"
  ON public.public_profile_meta FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.profile_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_profile_social_links_user_id
  ON public.profile_social_links(user_id);

ALTER TABLE public.profile_social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read social links"
  ON public.profile_social_links FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users manage own social links"
  ON public.profile_social_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
