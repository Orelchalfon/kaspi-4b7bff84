
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('parent', 'child');
CREATE TYPE public.task_status AS ENUM ('assigned', 'submitted', 'approved', 'rejected');
CREATE TYPE public.transaction_type AS ENUM ('reward_credit', 'manual_adjustment');

-- Households
CREATE TABLE public.households (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

-- Child profiles
CREATE TABLE public.child_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  status task_status NOT NULL DEFAULT 'assigned',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions (immutable ledger)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id),
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  idempotency_key TEXT NOT NULL UNIQUE
);

-- Unique constraint to prevent double-credit for same task
CREATE UNIQUE INDEX idx_transactions_task_reward ON public.transactions(task_id, type) WHERE type = 'reward_credit';

-- Security definer function: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function: get household
CREATE OR REPLACE FUNCTION public.get_user_household_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RPC: Approve task atomically
CREATE OR REPLACE FUNCTION public.approve_task(_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _task RECORD;
  _user_id UUID;
  _tx_id UUID;
BEGIN
  _user_id := auth.uid();
  
  -- Get task and verify
  SELECT * INTO _task FROM public.tasks WHERE id = _task_id;
  
  IF _task IS NULL THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;
  
  -- Verify caller is parent in same household
  IF NOT public.has_role(_user_id, 'parent') THEN
    RETURN jsonb_build_object('error', 'Only parents can approve tasks');
  END IF;
  
  IF public.get_user_household_id(_user_id) != _task.household_id THEN
    RETURN jsonb_build_object('error', 'Task not in your household');
  END IF;
  
  IF _task.status != 'submitted' THEN
    RETURN jsonb_build_object('error', 'Task must be in submitted status');
  END IF;
  
  -- Insert transaction (idempotency key prevents double-credit)
  INSERT INTO public.transactions (household_id, child_profile_id, task_id, type, amount, created_by, idempotency_key)
  VALUES (_task.household_id, _task.child_profile_id, _task_id, 'reward_credit', _task.reward_amount, _user_id, 'reward:' || _task_id::text)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO _tx_id;
  
  IF _tx_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Task already approved');
  END IF;
  
  -- Update task status
  UPDATE public.tasks SET status = 'approved', approved_at = now(), updated_at = now()
  WHERE id = _task_id;
  
  RETURN jsonb_build_object('success', true, 'transaction_id', _tx_id);
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS: households
CREATE POLICY "Users can view own household"
  ON public.households FOR SELECT TO authenticated
  USING (id = public.get_user_household_id(auth.uid()));

CREATE POLICY "Authenticated users can create household"
  ON public.households FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS: user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Parents can view household roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

CREATE POLICY "Parents can insert roles in own household"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

-- RLS: child_profiles
CREATE POLICY "Household members can view children"
  ON public.child_profiles FOR SELECT TO authenticated
  USING (household_id = public.get_user_household_id(auth.uid()));

CREATE POLICY "Parents can create children"
  ON public.child_profiles FOR INSERT TO authenticated
  WITH CHECK (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

-- RLS: tasks
CREATE POLICY "Household members can view tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (household_id = public.get_user_household_id(auth.uid()));

CREATE POLICY "Parents can create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

CREATE POLICY "Parents can update tasks in household"
  ON public.tasks FOR UPDATE TO authenticated
  USING (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

CREATE POLICY "Children can update own tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (household_id = public.get_user_household_id(auth.uid()) AND child_profile_id IN (
    SELECT id FROM public.child_profiles WHERE user_id = auth.uid()
  ));

-- RLS: transactions
CREATE POLICY "Household members can view transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (household_id = public.get_user_household_id(auth.uid()));

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_child_profiles_updated_at BEFORE UPDATE ON public.child_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
