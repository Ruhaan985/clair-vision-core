REVOKE ALL ON FUNCTION public.handle_new_lumen_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.display_name_available(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_profiles_updated_at() FROM PUBLIC, anon, authenticated;