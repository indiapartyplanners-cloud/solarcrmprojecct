-- Allow users to assign their own role during onboarding
-- This enables the role selection flow without admin approval

CREATE POLICY "Users can insert own role" ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
