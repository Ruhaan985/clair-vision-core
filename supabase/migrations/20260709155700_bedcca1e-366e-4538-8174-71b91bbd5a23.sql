CREATE OR REPLACE FUNCTION public.handle_new_lumen_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_name TEXT;
  v_lang TEXT;
BEGIN
  v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), split_part(NEW.email, '@', 1));
  v_lang := COALESCE(NULLIF(NEW.raw_user_meta_data->>'preferred_language', ''), 'en');
  INSERT INTO public.profiles (user_id, display_name, preferred_language)
  VALUES (NEW.id, v_name, v_lang);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created_lumen ON auth.users;
CREATE TRIGGER on_auth_user_created_lumen
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_lumen_user();

CREATE OR REPLACE FUNCTION public.display_name_available(_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(_name));
$fn$;

GRANT EXECUTE ON FUNCTION public.display_name_available(TEXT) TO anon, authenticated;