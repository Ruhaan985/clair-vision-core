DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
      AND tgname IN (
        'on_auth_user_created_admin',
        'on_auth_user_created_grant_admin',
        'on_auth_user_created_lumen',
        'on_auth_user_created_profile',
        'on_auth_user_created_rank'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_lumen_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_lang text;
BEGIN
  v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), split_part(NEW.email, '@', 1));
  v_lang := COALESCE(NULLIF(NEW.raw_user_meta_data->>'preferred_language', ''), 'en');

  INSERT INTO public.profiles (user_id, display_name, preferred_language)
  VALUES (NEW.id, v_name, v_lang)
  ON CONFLICT (user_id) DO NOTHING;

  IF lower(COALESCE(NEW.email, '')) = 'wo1359rk@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_lumen_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_lumen_user() TO service_role;

CREATE TRIGGER on_auth_user_created_lumen
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_lumen_user();

DO $$ BEGIN
  CREATE TYPE public.lumen_rank AS ENUM (
    'bronze', 'silver', 'gold', 'platinum', 'diamond', 'onyx', 'nemesis', 'arch_nemesis'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_ranks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rank public.lumen_rank NOT NULL DEFAULT 'bronze',
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_ranks TO authenticated;
GRANT ALL ON public.user_ranks TO service_role;
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own rank" ON public.user_ranks;
CREATE POLICY "Users read own rank"
ON public.user_ranks FOR SELECT TO authenticated
USING (user_id = auth.uid());

INSERT INTO public.user_ranks (user_id, rank)
SELECT id, 'bronze'::public.lumen_rank FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_lumen_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_ranks (user_id, rank)
  VALUES (NEW.id, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_lumen_rank() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_lumen_rank() TO service_role;

CREATE TRIGGER on_auth_user_created_rank
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_lumen_rank();