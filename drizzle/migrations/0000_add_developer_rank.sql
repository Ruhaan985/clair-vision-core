ALTER TYPE public.lumen_rank ADD VALUE IF NOT EXISTS 'developer';

CREATE OR REPLACE FUNCTION public.tg_user_ranks_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.points IS NULL THEN NEW.points := 0; END IF;
  IF NEW.points < 0 THEN NEW.points := 0; END IF;
  -- The Developer rank is granted manually by an admin and is never
  -- recalculated from points.
  IF NEW.rank::text = 'developer' THEN
    RETURN NEW;
  END IF;
  NEW.rank := public.rank_for_points(NEW.points);
  RETURN NEW;
END;
$$;