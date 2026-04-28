-- Expand role enum for new business role taxonomy
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'engineering';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'procurement';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'execution';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Keep legacy and new role names interoperable for existing RLS policies.
-- Existing policies still call has_role(..., 'project_manager'|'engineer'|'qa_manager'|'customer').
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role::text = 'project_manager' AND role::text = 'sales')
        OR (_role::text = 'sales' AND role::text = 'project_manager')
        OR (_role::text = 'engineer' AND role::text IN ('engineering', 'execution'))
        OR (_role::text IN ('engineering', 'execution') AND role::text = 'engineer')
        OR (_role::text = 'qa_manager' AND role::text = 'procurement')
        OR (_role::text = 'procurement' AND role::text = 'qa_manager')
        OR (_role::text = 'customer' AND role::text = 'client')
        OR (_role::text = 'client' AND role::text = 'customer')
      )
  );
$$;