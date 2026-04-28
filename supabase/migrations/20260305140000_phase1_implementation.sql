-- Phase 1 Implementation: Audit Logging, RLS, Notifications, and Checklist Execution
-- This migration completes the core functionality requirements

-- ============================================================================
-- 1. AUDIT LOGGING SYSTEM
-- ============================================================================

-- Create immutable audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_events (
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    ) VALUES (
      auth.uid(),
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      jsonb_build_object('old_value', to_jsonb(OLD))
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_events (
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    ) VALUES (
      auth.uid(),
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      jsonb_build_object('old_value', to_jsonb(OLD), 'new_value', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events (
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    ) VALUES (
      auth.uid(),
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      jsonb_build_object('new_value', to_jsonb(NEW))
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all tracked tables
DROP TRIGGER IF EXISTS audit_projects ON public.projects;
CREATE TRIGGER audit_projects
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_tasks ON public.tasks;
CREATE TRIGGER audit_tasks
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_documents ON public.documents;
CREATE TRIGGER audit_documents
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_milestones ON public.milestones;
CREATE TRIGGER audit_milestones
AFTER INSERT OR UPDATE OR DELETE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_clients ON public.clients;
CREATE TRIGGER audit_clients
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_sites ON public.sites;
CREATE TRIGGER audit_sites
AFTER INSERT OR UPDATE OR DELETE ON public.sites
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Prevent audit events from being modified
DROP POLICY IF EXISTS "Audit events are immutable" ON public.audit_events;
CREATE POLICY "Audit events are immutable" ON public.audit_events FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Audit events cannot be deleted" ON public.audit_events;
CREATE POLICY "Audit events cannot be deleted" ON public.audit_events FOR DELETE USING (false);

-- Drop old policy name and create new one
DROP POLICY IF EXISTS "Admins view audit" ON public.audit_events;
DROP POLICY IF EXISTS "Admins can view audit events" ON public.audit_events;
CREATE POLICY "Admins can view audit events" ON public.audit_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 2. COMPLETE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Projects RLS
DROP POLICY IF EXISTS "Projects viewable by team" ON public.projects;
CREATE POLICY "Projects viewable by team" ON public.projects FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'project_manager')
  OR EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = projects.client_id 
    AND clients.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager')
);

-- Tasks RLS
DROP POLICY IF EXISTS "Tasks viewable by team" ON public.tasks;
CREATE POLICY "Tasks viewable by team" ON public.tasks FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'project_manager')
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE project_id = tasks.project_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager')
);

DROP POLICY IF EXISTS "Engineers can update assigned tasks" ON public.tasks;
CREATE POLICY "Engineers can update assigned tasks" ON public.tasks FOR UPDATE USING (
  assigned_to = auth.uid()
);

-- Documents RLS with AFC restriction
DROP POLICY IF EXISTS "Documents viewable by team" ON public.documents;
CREATE POLICY "Documents viewable by team" ON public.documents FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'project_manager')
  OR (
    public.has_role(auth.uid(), 'engineer')
    AND state = 'afc'
    AND EXISTS (
      SELECT 1 FROM public.project_assignments 
      WHERE project_id = documents.project_id AND user_id = auth.uid()
    )
  )
  OR (
    public.has_role(auth.uid(), 'customer')
    AND state = 'afc'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON p.client_id = c.id
      WHERE p.id = documents.project_id AND c.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
CREATE POLICY "Admins can manage documents" ON public.documents FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager')
);

-- Milestones RLS
DROP POLICY IF EXISTS "Milestones viewable by team" ON public.milestones;
CREATE POLICY "Milestones viewable by team" ON public.milestones FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'project_manager')
  OR EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE project_id = milestones.project_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.clients c ON p.client_id = c.id
    WHERE p.id = milestones.project_id AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage milestones" ON public.milestones;
CREATE POLICY "Admins can manage milestones" ON public.milestones FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager')
);

-- Photos RLS
DROP POLICY IF EXISTS "Photos viewable by team" ON public.photos;
CREATE POLICY "Photos viewable by team" ON public.photos FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'project_manager')
  OR uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE project_id = photos.project_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Engineers can upload photos" ON public.photos;
CREATE POLICY "Engineers can upload photos" ON public.photos FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'engineer') AND uploaded_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins can manage photos" ON public.photos;
CREATE POLICY "Admins can manage photos" ON public.photos FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager')
);

-- Daily Logs RLS
DROP POLICY IF EXISTS "Daily logs viewable by team" ON public.daily_logs;
CREATE POLICY "Daily logs viewable by team" ON public.daily_logs FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'project_manager')
  OR logged_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE project_id = daily_logs.project_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Engineers can create logs" ON public.daily_logs;
CREATE POLICY "Engineers can create logs" ON public.daily_logs FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'engineer') AND logged_by = auth.uid()
);

DROP POLICY IF EXISTS "Engineers can update own logs" ON public.daily_logs;
CREATE POLICY "Engineers can update own logs" ON public.daily_logs FOR UPDATE USING (
  logged_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins can manage logs" ON public.daily_logs;
CREATE POLICY "Admins can manage logs" ON public.daily_logs FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager')
);

-- ============================================================================
-- 3. NOTIFICATION SYSTEM TRIGGERS
-- ============================================================================

-- Function to notify on task assignment
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM public.create_notification(
      NEW.assigned_to,
      'New Task Assigned',
      'You have been assigned to task: ' || NEW.title,
      'info',
      '/engineer/tasks'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.tasks;
CREATE TRIGGER trigger_notify_task_assigned
AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- Function to notify on document approval
CREATE OR REPLACE FUNCTION public.notify_document_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name TEXT;
BEGIN
  IF NEW.state = 'afc' AND (OLD IS NULL OR OLD.state != 'afc') THEN
    -- Get project name
    SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;
    
    -- Notify all engineers on the project
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT 
      pa.user_id,
      'Document Approved',
      'Document "' || NEW.name || '" has been approved for project: ' || v_project_name,
      'success',
      '/admin/documents'
    FROM public.project_assignments pa
    JOIN public.user_roles ur ON pa.user_id = ur.user_id
    WHERE pa.project_id = NEW.project_id AND ur.role = 'engineer';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_document_approved ON public.documents;
CREATE TRIGGER trigger_notify_document_approved
AFTER INSERT OR UPDATE OF state ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.notify_document_approved();

-- Function to notify on project stage update
CREATE OR REPLACE FUNCTION public.notify_project_stage_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    -- Notify all team members
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT 
      pa.user_id,
      'Project Stage Updated',
      'Project "' || NEW.name || '" moved to stage: ' || NEW.stage,
      'info',
      '/admin/projects/' || NEW.id::text
    FROM public.project_assignments pa
    WHERE pa.project_id = NEW.id;
    
    -- If stage is closeout_delivered, trigger closeout package generation
    IF NEW.stage = 'closeout_delivered' THEN
      -- This will be handled by Edge Function
      PERFORM pg_notify('closeout_package_needed', json_build_object('project_id', NEW.id)::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_project_stage_updated ON public.projects;
CREATE TRIGGER trigger_notify_project_stage_updated
AFTER UPDATE OF stage ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.notify_project_stage_updated();

-- ============================================================================
-- 4. CHECKLIST EXECUTION ENHANCEMENTS
-- ============================================================================

-- Add status column to checklist_runs if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checklist_runs' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.checklist_runs ADD COLUMN status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed'));
  END IF;
END $$;

-- Function to auto-complete checklist when all items checked
CREATE OR REPLACE FUNCTION public.auto_complete_checklist()
RETURNS TRIGGER AS $$
DECLARE
  v_template_items JSONB;
  v_completed_items JSONB;
  v_total_required INTEGER;
  v_completed_count INTEGER;
BEGIN
  -- Get template items
  SELECT items INTO v_template_items 
  FROM public.checklist_templates 
  WHERE id = NEW.template_id;
  
  -- Count required items
  SELECT COUNT(*) INTO v_total_required
  FROM jsonb_array_elements(v_template_items) item
  WHERE (item->>'required')::boolean = true;
  
  -- Count completed required items
  v_completed_items := NEW.completed_items;
  SELECT COUNT(*) INTO v_completed_count
  FROM jsonb_array_elements(v_template_items) template_item
  JOIN jsonb_array_elements(v_completed_items) completed_item
    ON template_item->>'id' = completed_item->>'id'
  WHERE (template_item->>'required')::boolean = true
    AND (completed_item->>'checked')::boolean = true;
  
  -- Auto-complete if all required items are checked
  IF v_completed_count >= v_total_required THEN
    NEW.status := 'completed';
    NEW.completed_at := now();
    NEW.completed_by := auth.uid()::text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_complete_checklist ON public.checklist_runs;
CREATE TRIGGER trigger_auto_complete_checklist
BEFORE UPDATE OF completed_items ON public.checklist_runs
FOR EACH ROW EXECUTE FUNCTION public.auto_complete_checklist();

-- ============================================================================
-- 5. STORAGE BUCKETS FOR CLOSEOUT PACKAGES
-- ============================================================================

-- Create closeout packages bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('closeout-packages', 'closeout-packages', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for closeout packages
DROP POLICY IF EXISTS "Authenticated users can view closeout packages" ON storage.objects;
CREATE POLICY "Authenticated users can view closeout packages"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'closeout-packages');

DROP POLICY IF EXISTS "Admins can upload closeout packages" ON storage.objects;
CREATE POLICY "Admins can upload closeout packages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'closeout-packages' 
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON public.project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON public.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_photos_project ON public.photos(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_logged_by ON public.daily_logs(logged_by);
CREATE INDEX IF NOT EXISTS idx_documents_state ON public.documents(state);
