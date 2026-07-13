-- Applied to project flxhxmrtdqegfsupvvus via Supabase MCP.
-- Adds AI voice tutors: parents configure a `tutors` row (subject/topic/
-- personality/voice), children start `tutor_sessions` with them. No changes
-- to `transactions` or its CHECK constraint — sessions are not paid.

-- 1) tutors table
CREATE TABLE public.tutors (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 60),
  topic text NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 200),
  personality text NOT NULL DEFAULT 'friendly'
    CHECK (personality IN ('friendly','playful','calm','strict')),
  voice_id text NOT NULL CHECK (char_length(voice_id) BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutors_household ON public.tutors(household_id);
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutors: read own household" ON public.tutors FOR SELECT
USING (household_id IN (SELECT household_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "tutors: insert by parent" ON public.tutors FOR INSERT
WITH CHECK (
  household_id IN (SELECT household_id FROM public.user_roles WHERE user_id = auth.uid())
  AND created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid() AND ur.role = 'parent' AND ur.household_id = tutors.household_id)
);

CREATE POLICY "tutors: update by parent" ON public.tutors FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.role = 'parent' AND ur.household_id = tutors.household_id));

CREATE POLICY "tutors: delete by parent" ON public.tutors FOR DELETE
USING (EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.role = 'parent' AND ur.household_id = tutors.household_id));

-- Reuses the trigger function created in 20260518185128_add_savings_and_goals.sql
DROP TRIGGER IF EXISTS set_tutors_updated_at ON public.tutors;
CREATE TRIGGER set_tutors_updated_at BEFORE UPDATE ON public.tutors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) tutor_sessions table
CREATE TABLE public.tutor_sessions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','failed')),
  elevenlabs_conversation_id text,
  transcript jsonb,
  transcript_source text CHECK (transcript_source IN ('client','elevenlabs_api')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutor_sessions_household ON public.tutor_sessions(household_id);
CREATE INDEX idx_tutor_sessions_tutor ON public.tutor_sessions(tutor_id);
CREATE INDEX idx_tutor_sessions_child ON public.tutor_sessions(child_id);
ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutor_sessions: read own" ON public.tutor_sessions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'parent' AND ur.household_id = tutor_sessions.household_id)
  OR EXISTS (SELECT 1 FROM public.child_profiles cp
             WHERE cp.id = tutor_sessions.child_id AND cp.user_id = auth.uid())
);

CREATE POLICY "tutor_sessions: insert by child owner or parent" ON public.tutor_sessions FOR INSERT
WITH CHECK (
  household_id IN (SELECT household_id FROM public.user_roles WHERE user_id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM public.child_profiles cp
            WHERE cp.id = tutor_sessions.child_id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.role = 'parent' AND ur.household_id = tutor_sessions.household_id)
  )
);

CREATE POLICY "tutor_sessions: update own" ON public.tutor_sessions FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'parent' AND ur.household_id = tutor_sessions.household_id)
  OR EXISTS (SELECT 1 FROM public.child_profiles cp
             WHERE cp.id = tutor_sessions.child_id AND cp.user_id = auth.uid())
);
