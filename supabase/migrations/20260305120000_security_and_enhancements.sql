-- Security and Enhancement Migration
-- Fixes role assignment security and adds missing features

-- Role Requests Table (Fix security vulnerability)
CREATE TABLE public.role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_role app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.role_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own requests" ON public.role_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all requests" ON public.role_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update requests" ON public.role_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_role_requests_updated_at BEFORE UPDATE ON public.role_requests 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Task Comments Table (Missing feature)
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments" ON public.task_comments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_comments.task_id 
    AND (
      public.has_role(auth.uid(), 'admin') 
      OR public.has_role(auth.uid(), 'project_manager')
      OR tasks.assigned_to = auth.uid()
    )
  )
);
CREATE POLICY "Users can create comments" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_comments.task_id 
    AND (
      public.has_role(auth.uid(), 'admin') 
      OR public.has_role(auth.uid(), 'project_manager')
      OR tasks.assigned_to = auth.uid()
    )
  )
);
CREATE POLICY "Users can update own comments" ON public.task_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.task_comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve role request
CREATE OR REPLACE FUNCTION public.approve_role_request(
  p_request_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_role app_role;
BEGIN
  -- Check if admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve role requests';
  END IF;

  -- Get request details
  SELECT user_id, requested_role INTO v_user_id, v_role
  FROM public.role_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update request status
  UPDATE public.role_requests
  SET status = 'approved', approved_by = p_admin_id, updated_at = now()
  WHERE id = p_request_id;

  -- Create notification
  PERFORM public.create_notification(
    v_user_id,
    'Role Request Approved',
    'Your request for ' || v_role || ' role has been approved.',
    'success',
    '/role-selection'
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject role request
CREATE OR REPLACE FUNCTION public.reject_role_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_role app_role;
BEGIN
  -- Check if admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject role requests';
  END IF;

  -- Get request details
  SELECT user_id, requested_role INTO v_user_id, v_role
  FROM public.role_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Update request status
  UPDATE public.role_requests
  SET status = 'rejected', approved_by = p_admin_id, rejection_reason = p_reason, updated_at = now()
  WHERE id = p_request_id;

  -- Create notification
  PERFORM public.create_notification(
    v_user_id,
    'Role Request Rejected',
    'Your request for ' || v_role || ' role has been rejected.' || COALESCE(' Reason: ' || p_reason, ''),
    'error',
    '/role-selection'
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance
CREATE INDEX idx_role_requests_user_id ON public.role_requests(user_id);
CREATE INDEX idx_role_requests_status ON public.role_requests(status);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_notifications_user_id_read ON public.notifications(user_id, read);
