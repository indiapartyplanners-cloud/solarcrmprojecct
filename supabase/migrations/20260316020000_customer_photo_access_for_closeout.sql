-- Allow customers to view project photos for their own projects
-- This supports closeout package photo evidence generation in customer panel

DROP POLICY IF EXISTS "Customers view own project photos" ON public.photos;
CREATE POLICY "Customers view own project photos" ON public.photos
FOR SELECT
USING (
  public.has_role(auth.uid(), 'customer')
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = photos.project_id
    AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Customers view own task photos" ON public.task_photos;
CREATE POLICY "Customers view own task photos" ON public.task_photos
FOR SELECT
USING (
  public.has_role(auth.uid(), 'customer')
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = task_photos.project_id
    AND c.user_id = auth.uid()
  )
);