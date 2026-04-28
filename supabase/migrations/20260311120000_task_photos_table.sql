-- Create task_photos table for field engineers to upload task-related photos
CREATE TABLE public.task_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for task_photos
-- Users can view photos for tasks they're assigned to or projects they're part of
CREATE POLICY "Users can view task photos" ON public.task_photos FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_photos.task_id 
    AND (
      tasks.assigned_to = auth.uid() 
      OR tasks.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_assignments 
        WHERE project_assignments.project_id = task_photos.project_id 
        AND project_assignments.user_id = auth.uid()
      )
    )
  )
);

-- Users can upload photos for tasks assigned to them
CREATE POLICY "Users can create task photos" ON public.task_photos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_photos.task_id 
    AND tasks.assigned_to = auth.uid()
  )
);

-- Users can update their own uploaded photos
CREATE POLICY "Users can update own photos" ON public.task_photos FOR UPDATE USING (auth.uid() = uploaded_by);

-- Users can delete their own uploaded photos
CREATE POLICY "Users can delete own photos" ON public.task_photos FOR DELETE USING (auth.uid() = uploaded_by);

-- Create trigger for updated_at
CREATE TRIGGER update_task_photos_updated_at BEFORE UPDATE ON public.task_photos 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_task_photos_task_id ON public.task_photos(task_id);
CREATE INDEX idx_task_photos_project_id ON public.task_photos(project_id);
CREATE INDEX idx_task_photos_uploaded_by ON public.task_photos(uploaded_by);
CREATE INDEX idx_task_photos_uploaded_at ON public.task_photos(uploaded_at DESC);

-- Add comment
COMMENT ON TABLE public.task_photos IS 'Stores photos uploaded by field engineers for documentation of task work';
