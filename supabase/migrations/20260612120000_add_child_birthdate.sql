-- Applied to project flxhxmrtdqegfsupvvus on 2026-06-12 via Supabase MCP.
-- Adds child_profiles.birthdate for age-based quiz leveling, teaches
-- handle_new_user to read `birthdate` from user_metadata, and adds the
-- set_child_birthdate RPC so parents can edit it without relying on the
-- broad child_profiles UPDATE policy.

-- 1) birthdate column + sanity range. Nullable: legacy children have no
--    birthdate and fall back to the middle quiz tier in the app.
ALTER TABLE public.child_profiles ADD COLUMN birthdate date;
ALTER TABLE public.child_profiles ADD CONSTRAINT child_profiles_birthdate_sane
  CHECK (birthdate IS NULL OR (birthdate <= CURRENT_DATE AND birthdate >= DATE '2000-01-01'));

-- 2) handle_new_user: same body as live, plus birthdate for the child branch.
--    A malformed or out-of-range birthdate is clamped to NULL instead of
--    raising — trigger failure would roll back the auth.users insert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_household_id UUID;
  v_household_name TEXT;
  v_full_name TEXT;
  v_role TEXT;
  v_birthdate DATE;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  IF v_role = 'child' THEN
    -- Get household ID passed in metadata from the parent explicitly
    v_household_id := (NEW.raw_user_meta_data->>'household_id')::UUID;

    BEGIN
      v_birthdate := NULLIF(NEW.raw_user_meta_data->>'birthdate', '')::DATE;
    EXCEPTION WHEN others THEN
      v_birthdate := NULL;
    END;
    IF v_birthdate IS NOT NULL
       AND (v_birthdate > CURRENT_DATE OR v_birthdate < DATE '2000-01-01') THEN
      v_birthdate := NULL;
    END IF;

    -- Assign user role 'child'
    INSERT INTO public.user_roles (user_id, household_id, role)
    VALUES (NEW.id, v_household_id, 'child');

    -- Auto-create the child_profile linked to this user_id
    INSERT INTO public.child_profiles (user_id, household_id, display_name, birthdate)
    VALUES (NEW.id, v_household_id, v_full_name, v_birthdate);

  ELSE
    -- Original parent logic
    v_household_name := COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'household_name'), ''),
      NULLIF(TRIM(v_full_name) || '''s Household', '''s Household'),
      'New Household'
    );
    INSERT INTO public.households (name)
    VALUES (v_household_name)
    RETURNING id INTO v_household_id;

    INSERT INTO public.user_roles (user_id, household_id, role)
    VALUES (NEW.id, v_household_id, 'parent');
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) set_child_birthdate: household-parent-only edit, NULL allowed to clear.
CREATE OR REPLACE FUNCTION public.set_child_birthdate(_child_id uuid, _birthdate date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_household_id uuid;
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

  IF _birthdate IS NOT NULL
     AND (_birthdate > CURRENT_DATE OR _birthdate < DATE '2000-01-01') THEN
    RETURN jsonb_build_object('error', 'Birthdate out of range');
  END IF;

  UPDATE public.child_profiles SET birthdate = _birthdate WHERE id = _child_id;

  RETURN jsonb_build_object('success', true, 'birthdate', _birthdate);
END;
$$;
