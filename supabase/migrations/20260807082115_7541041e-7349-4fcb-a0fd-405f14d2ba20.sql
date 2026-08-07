ALTER TABLE public.user_ranks ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.rank_for_points(_points integer)
RETURNS lumen_rank
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _points >= 10000 THEN 'arch_nemesis'::lumen_rank
    WHEN _points >= 7200  THEN 'nemesis'::lumen_rank
    WHEN _points >= 5000  THEN 'onyx'::lumen_rank
    WHEN _points >= 3200  THEN 'diamond'::lumen_rank
    WHEN _points >= 1800  THEN 'platinum'::lumen_rank
    WHEN _points >= 800   THEN 'gold'::lumen_rank
    WHEN _points >= 200   THEN 'silver'::lumen_rank
    ELSE 'bronze'::lumen_rank
  END
$$;

REVOKE EXECUTE ON FUNCTION public.rank_for_points(integer) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_user_ranks_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.points IS NULL THEN NEW.points := 0; END IF;
  IF NEW.points < 0 THEN NEW.points := 0; END IF;
  NEW.rank := public.rank_for_points(NEW.points);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_ranks_sync ON public.user_ranks;
CREATE TRIGGER user_ranks_sync
BEFORE INSERT OR UPDATE ON public.user_ranks
FOR EACH ROW EXECUTE FUNCTION public.tg_user_ranks_sync();
