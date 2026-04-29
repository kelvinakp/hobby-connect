-- Include student_id in the auto-created profile row on signup.
-- Previously only email, first_name, last_name were populated.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, student_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE
  SET email      = COALESCE(EXCLUDED.email, public.profiles.email),
      student_id = COALESCE(EXCLUDED.student_id, public.profiles.student_id);

  RETURN NEW;
END;
$$;

-- Backfill student_id for existing users who registered before this migration.
UPDATE public.profiles p
SET student_id = u.raw_user_meta_data->>'student_id'
FROM auth.users u
WHERE p.id = u.id
  AND p.student_id IS NULL
  AND u.raw_user_meta_data->>'student_id' IS NOT NULL;
