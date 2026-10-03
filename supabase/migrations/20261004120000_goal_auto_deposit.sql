-- Applied to project jlpvjxywfvijntsctvaq on 2026-10-04 via Supabase MCP.
-- Automatic recurring goal deposits.
--   * goals gains auto_deposit / auto_source / next_auto_deposit_on /
--     last_auto_status / last_auto_at (additive, all defaulted — safe for mobile).
--   * goals_auto_schedule trigger owns the schedule: clients (anon/authenticated)
--     can toggle auto_deposit + auto_source but can't move the due date or
--     forge the last-run status.
--   * run_goal_auto_deposits() — internal, not callable by clients. Deposits
--     LEAST(cycle_amount, remaining) from the chosen source for every due goal.
--     Not enough money → marks 'insufficient' and leaves the due date, so it
--     retries the next day. Next cycle is counted from the day it actually ran.
--   * pg_cron runs it daily at 04:00 UTC (~06:00/07:00 Asia/Jerusalem).

CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.goals
  ADD COLUMN auto_deposit boolean NOT NULL DEFAULT false,
  ADD COLUMN auto_source text NOT NULL DEFAULT 'wallet'
    CHECK (auto_source IN ('wallet','savings')),
  ADD COLUMN next_auto_deposit_on date,
  ADD COLUMN last_auto_status text
    CHECK (last_auto_status IN ('deposited','insufficient')),
  ADD COLUMN last_auto_at timestamptz;

CREATE INDEX idx_goals_auto_due ON public.goals(next_auto_deposit_on)
  WHERE auto_deposit AND status = 'active';

-- Jerusalem calendar date + one cycle.
CREATE OR REPLACE FUNCTION public.goal_next_cycle_date(_from date, _period text)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT (_from + CASE _period
                    WHEN 'day'  THEN interval '1 day'
                    WHEN 'week' THEN interval '7 days'
                    ELSE interval '1 month'
                  END)::date
$$;

CREATE OR REPLACE FUNCTION public.goals_auto_schedule()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  v_client boolean := current_user IN ('anon','authenticated');
  v_enabling boolean;
BEGIN
  IF NOT NEW.auto_deposit THEN
    NEW.next_auto_deposit_on := NULL;
    IF TG_OP = 'UPDATE' AND v_client THEN
      NEW.last_auto_status := OLD.last_auto_status;
      NEW.last_auto_at := OLD.last_auto_at;
    ELSIF TG_OP = 'INSERT' AND v_client THEN
      NEW.last_auto_status := NULL;
      NEW.last_auto_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  v_enabling := TG_OP = 'INSERT' OR NOT OLD.auto_deposit
                OR NEW.cycle_period IS DISTINCT FROM OLD.cycle_period;

  IF v_client THEN
    IF v_enabling THEN
      NEW.next_auto_deposit_on := public.goal_next_cycle_date(v_today, NEW.cycle_period);
      NEW.last_auto_status := NULL;
      NEW.last_auto_at := NULL;
    ELSE
      -- Clients can't move the schedule or forge the run status.
      NEW.next_auto_deposit_on := OLD.next_auto_deposit_on;
      NEW.last_auto_status := OLD.last_auto_status;
      NEW.last_auto_at := OLD.last_auto_at;
    END IF;
  ELSIF NEW.next_auto_deposit_on IS NULL THEN
    -- Privileged writers (cron, service role) may set the date explicitly.
    NEW.next_auto_deposit_on := public.goal_next_cycle_date(v_today, NEW.cycle_period);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS goals_auto_schedule ON public.goals;
CREATE TRIGGER goals_auto_schedule BEFORE INSERT OR UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.goals_auto_schedule();

CREATE OR REPLACE FUNCTION public.run_goal_auto_deposits()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  v_goal RECORD;
  v_deposited numeric;
  v_balance numeric;
  v_amount integer;
  v_count integer := 0;
BEGIN
  FOR v_goal IN
    SELECT * FROM public.goals
    WHERE status = 'active' AND auto_deposit AND next_auto_deposit_on <= v_today
    ORDER BY next_auto_deposit_on
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Serialise with manual deposits touching the same child's balances.
    PERFORM 1 FROM public.child_profiles WHERE id = v_goal.child_id FOR UPDATE;

    SELECT COALESCE(SUM(amount), 0) INTO v_deposited FROM public.transactions
    WHERE goal_id = v_goal.id AND type = 'goal_credit';

    v_amount := LEAST(v_goal.cycle_amount, v_goal.target_amount - v_deposited)::integer;

    IF v_amount <= 0 THEN
      UPDATE public.goals SET status = 'completed', next_auto_deposit_on = NULL
      WHERE id = v_goal.id;
      CONTINUE;
    END IF;

    IF v_goal.auto_source = 'wallet' THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_balance FROM public.transactions
      WHERE child_id = v_goal.child_id
        AND type IN ('task_reward','manual_adjustment','wallet_debit','quiz_reward');
    ELSE
      SELECT COALESCE(SUM(amount), 0) INTO v_balance FROM public.transactions
      WHERE child_id = v_goal.child_id AND type = 'savings_credit';
    END IF;

    IF v_balance < v_amount THEN
      -- Keep the due date: retry tomorrow.
      UPDATE public.goals SET last_auto_status = 'insufficient', last_auto_at = now()
      WHERE id = v_goal.id;
      CONTINUE;
    END IF;

    IF v_goal.auto_source = 'wallet' THEN
      INSERT INTO public.transactions (household_id, child_id, type, amount, goal_id)
      VALUES (v_goal.household_id, v_goal.child_id, 'wallet_debit', -v_amount, v_goal.id);
      UPDATE public.child_profiles SET current_balance = current_balance - v_amount
      WHERE id = v_goal.child_id;
    ELSE
      INSERT INTO public.transactions (household_id, child_id, type, amount, goal_id)
      VALUES (v_goal.household_id, v_goal.child_id, 'savings_credit', -v_amount, v_goal.id);
    END IF;
    INSERT INTO public.transactions (household_id, child_id, type, amount, goal_id)
    VALUES (v_goal.household_id, v_goal.child_id, 'goal_credit', v_amount, v_goal.id);

    UPDATE public.goals SET
      last_auto_status = 'deposited',
      last_auto_at = now(),
      next_auto_deposit_on = public.goal_next_cycle_date(v_today, v_goal.cycle_period),
      status = CASE WHEN v_deposited + v_amount >= v_goal.target_amount
                    THEN 'completed' ELSE status END
    WHERE id = v_goal.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $$;

REVOKE EXECUTE ON FUNCTION public.run_goal_auto_deposits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.goals_auto_schedule() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'goal-auto-deposits',
  '0 4 * * *',
  $$SELECT public.run_goal_auto_deposits()$$
);
