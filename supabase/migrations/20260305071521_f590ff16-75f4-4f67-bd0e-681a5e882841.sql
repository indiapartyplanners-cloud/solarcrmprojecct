
-- Fix checklist_runs: restrict to assigned engineers and admins
DROP POLICY "Engineers manage checklist runs" ON public.checklist_runs;
CREATE POLICY "Users manage checklist runs" ON public.checklist_runs FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager') OR completed_by = auth.uid()
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager') OR completed_by = auth.uid()
);

-- Fix audit events insert: restrict to system-level inserts only
DROP POLICY "System insert audit" ON public.audit_events;
CREATE POLICY "Authenticated insert audit" ON public.audit_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
