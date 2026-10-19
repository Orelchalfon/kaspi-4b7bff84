-- Applied to project jlpvjxywfvijntsctvaq on 2026-10-19 via Supabase MCP.
-- QR-code gifts: any adult with a confirmed email opens a child's gift link
-- (/give/<token>, shown to the parent as a QR code) and submits a gift. The
-- gift stays 'pending' — no ledger rows — until a household parent approves it
-- (after the real shekels reached them). Approval posts it as a
-- 'manual_adjustment' tagged with reference_gift_id, so the wallet formula
-- (WALLET_TX_TYPES + the SUMs in deposit_to_goal / deposit_to_savings /
-- manual_adjustment / run_goal_auto_deposits) is unchanged, and applies the
-- household savings split copied verbatim from approve_task_and_pay.
-- Senders never join the child's household (user_roles is UNIQUE(user_id) and
-- every RLS policy keys off it).

-- 1) One gift link (token) per child. Only RPCs write it.
CREATE TABLE public.child_gift_links (
  child_id uuid PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);
ALTER TABLE public.child_gift_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.child_gift_links FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.child_gift_links FROM authenticated;

CREATE POLICY "child_gift_links: read by household parent" ON public.child_gift_links FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.role = 'parent'
                 AND ur.household_id = child_gift_links.household_id));

-- 2) Gifts. sender_name/sender_email are snapshots so history survives the
--    sender's account being deleted. No child-facing policy on purpose: the
--    child must never receive a stranger's name or email.
CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text NOT NULL CHECK (char_length(sender_name) BETWEEN 1 AND 40),
  sender_email text,
  reason text NOT NULL CHECK (reason IN ('haircut','birthday','holiday','help','school','gift')),
  amount integer NOT NULL CHECK (amount BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  client_request_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_gifts_household_status ON public.gifts(household_id, status);
CREATE INDEX idx_gifts_sender_child_pending ON public.gifts(sender_user_id, child_id)
  WHERE status = 'pending';
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gifts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.gifts FROM authenticated;

CREATE POLICY "gifts: read by sender or household parent" ON public.gifts FOR SELECT
USING (
  sender_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = auth.uid() AND ur.role = 'parent'
               AND ur.household_id = gifts.household_id)
);

-- 3) Ledger link
ALTER TABLE public.transactions
  ADD COLUMN reference_gift_id uuid REFERENCES public.gifts(id) ON DELETE SET NULL;
CREATE INDEX idx_transactions_gift ON public.transactions(reference_gift_id)
  WHERE reference_gift_id IS NOT NULL;

-- 4) child_gift_token: household parent gets (lazily creating) or rotates a child's token.
CREATE OR REPLACE FUNCTION public.child_gift_token(_child_id uuid, _rotate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_household_id uuid;
  v_token text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT household_id INTO v_household_id FROM public.child_profiles WHERE id = _child_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Child not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_user AND ur.role = 'parent' AND ur.household_id = v_household_id
  ) THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  IF _rotate THEN
    INSERT INTO public.child_gift_links (child_id, household_id)
    VALUES (_child_id, v_household_id)
    ON CONFLICT (child_id) DO UPDATE
      SET token = replace(gen_random_uuid()::text, '-', ''), rotated_at = now()
    RETURNING token INTO v_token;
  ELSE
    INSERT INTO public.child_gift_links (child_id, household_id)
    VALUES (_child_id, v_household_id)
    ON CONFLICT (child_id) DO NOTHING;
    SELECT token INTO v_token FROM public.child_gift_links WHERE child_id = _child_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'token', v_token);
END $$;

-- 5) get_gift_target: public lookup for the scan page. Name + avatar only, never ids.
CREATE OR REPLACE FUNCTION public.get_gift_target(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_cp RECORD;
BEGIN
  SELECT cp.display_name, cp.avatar INTO v_cp
  FROM public.child_gift_links l
  JOIN public.child_profiles cp ON cp.id = l.child_id
  WHERE l.token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  RETURN jsonb_build_object('display_name', v_cp.display_name, 'avatar', v_cp.avatar);
END $$;

-- 6) submit_gift: a confirmed-email adult (not a child) creates a pending gift. No ledger rows.
CREATE OR REPLACE FUNCTION public.submit_gift(
  _token text, _amount integer, _reason text, _sender_name text, _request_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text := btrim(COALESCE(_sender_name, ''));
  v_email text;
  v_confirmed_at timestamptz;
  v_existing RECORD;
  v_link RECORD;
  v_pending integer;
  v_gift_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  IF _request_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Missing request id');
  END IF;

  -- Idempotent retry of the same submit (double tap / network retry).
  SELECT id, sender_user_id, status INTO v_existing
  FROM public.gifts WHERE client_request_id = _request_id;
  IF FOUND THEN
    IF v_existing.sender_user_id IS DISTINCT FROM v_user THEN
      RETURN jsonb_build_object('error', 'Duplicate request');
    END IF;
    RETURN jsonb_build_object('success', true, 'gift_id', v_existing.id, 'status', v_existing.status);
  END IF;

  SELECT email, email_confirmed_at INTO v_email, v_confirmed_at
  FROM auth.users WHERE id = v_user;
  IF v_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('error', 'Email not confirmed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role = 'child') THEN
    RETURN jsonb_build_object('error', 'Children cannot send gifts');
  END IF;

  IF _amount IS NULL OR _amount < 1 OR _amount > 500 THEN
    RETURN jsonb_build_object('error', 'Invalid amount');
  END IF;
  IF _reason IS NULL OR _reason NOT IN ('haircut','birthday','holiday','help','school','gift') THEN
    RETURN jsonb_build_object('error', 'Invalid reason');
  END IF;
  IF char_length(v_name) < 1 OR char_length(v_name) > 40 THEN
    RETURN jsonb_build_object('error', 'Invalid sender name');
  END IF;

  SELECT child_id, household_id INTO v_link
  FROM public.child_gift_links WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Gift link not found');
  END IF;

  SELECT count(*) INTO v_pending FROM public.gifts
  WHERE sender_user_id = v_user AND child_id = v_link.child_id AND status = 'pending';
  IF v_pending >= 3 THEN
    RETURN jsonb_build_object('error', 'Too many pending gifts');
  END IF;

  INSERT INTO public.gifts
    (household_id, child_id, sender_user_id, sender_name, sender_email, reason, amount, client_request_id)
  VALUES
    (v_link.household_id, v_link.child_id, v_user, v_name, v_email, _reason, _amount, _request_id)
  RETURNING id INTO v_gift_id;

  RETURN jsonb_build_object('success', true, 'gift_id', v_gift_id, 'status', 'pending');
END $$;

-- 7) approve_gift_and_pay: household parent posts a pending gift to the ledger.
--    Savings split is the exact expression from approve_task_and_pay.
CREATE OR REPLACE FUNCTION public.approve_gift_and_pay(_gift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_gift RECORD;
  v_pct integer := 0;
  v_save numeric := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_gift FROM public.gifts WHERE id = _gift_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Gift not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_user AND ur.role = 'parent' AND ur.household_id = v_gift.household_id
  ) THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  IF v_gift.status = 'approved'
     OR EXISTS (SELECT 1 FROM public.transactions WHERE reference_gift_id = _gift_id) THEN
    RETURN jsonb_build_object('success', true, 'already_approved', true);
  END IF;
  IF v_gift.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'Gift is not pending');
  END IF;

  PERFORM 1 FROM public.child_profiles WHERE id = v_gift.child_id FOR UPDATE;

  UPDATE public.gifts
     SET status = 'approved', reviewed_at = now(), reviewed_by = v_user
   WHERE id = _gift_id;

  INSERT INTO public.transactions (household_id, child_id, type, amount, reference_gift_id)
  VALUES (v_gift.household_id, v_gift.child_id, 'manual_adjustment', v_gift.amount, _gift_id);

  SELECT savings_percentage INTO v_pct FROM public.household_settings
  WHERE household_id = v_gift.household_id;
  IF v_pct IS NULL THEN v_pct := 0; END IF;

  IF v_pct > 0 THEN
    v_save := floor(v_gift.amount * v_pct / 100.0);
    IF v_save > 0 THEN
      INSERT INTO public.transactions (household_id, child_id, type, amount, reference_gift_id)
      VALUES (v_gift.household_id, v_gift.child_id, 'wallet_debit', -v_save, _gift_id);
      INSERT INTO public.transactions (household_id, child_id, type, amount, reference_gift_id)
      VALUES (v_gift.household_id, v_gift.child_id, 'savings_credit', v_save, _gift_id);
    END IF;
  END IF;

  UPDATE public.child_profiles
     SET current_balance = current_balance + v_gift.amount - v_save
   WHERE id = v_gift.child_id;

  RETURN jsonb_build_object(
    'success', true,
    'wallet_delta', v_gift.amount - v_save,
    'savings_delta', v_save
  );
END $$;

-- 8) reject_gift: household parent declines a pending gift. No ledger rows.
CREATE OR REPLACE FUNCTION public.reject_gift(_gift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_gift RECORD;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_gift FROM public.gifts WHERE id = _gift_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Gift not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_user AND ur.role = 'parent' AND ur.household_id = v_gift.household_id
  ) THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  IF v_gift.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'Gift is not pending');
  END IF;

  UPDATE public.gifts
     SET status = 'rejected', reviewed_at = now(), reviewed_by = v_user
   WHERE id = _gift_id;

  RETURN jsonb_build_object('success', true);
END $$;

-- 9) Execute grants: only get_gift_target is reachable without signing in.
REVOKE EXECUTE ON FUNCTION public.child_gift_token(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_gift(text, integer, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_gift_and_pay(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_gift(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.child_gift_token(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_gift(text, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_gift_and_pay(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_gift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gift_target(text) TO anon, authenticated;
