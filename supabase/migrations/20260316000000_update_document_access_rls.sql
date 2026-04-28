-- Align document access with customer/engineer approved document visibility
-- Customers and engineers can access AFC and As-Built documents scoped to their projects

DROP POLICY IF EXISTS "Documents viewable by team" ON public.documents;

CREATE POLICY "Documents viewable by team" ON public.documents
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'project_manager')
  OR (
    public.has_role(auth.uid(), 'engineer')
    AND state IN ('afc', 'as_built')
    AND EXISTS (
      SELECT 1
      FROM public.project_assignments pa
      WHERE pa.project_id = documents.project_id
      AND pa.user_id = auth.uid()
    )
  )
  OR (
    public.has_role(auth.uid(), 'customer')
    AND state IN ('afc', 'as_built')
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.clients c ON p.client_id = c.id
      WHERE p.id = documents.project_id
      AND c.user_id = auth.uid()
    )
  )
);