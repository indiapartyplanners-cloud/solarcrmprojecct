-- Stage-level notes and documents for project lifecycle cards
CREATE TABLE IF NOT EXISTS public.project_stage_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  notes TEXT,
  entered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, stage_key)
);

ALTER TABLE public.project_stage_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View stage files" ON public.project_stage_files FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE
                p.id = project_stage_files.project_id
                AND (
                    public.has_role (auth.uid (), 'admin')
                    OR public.has_role (
                        auth.uid (), 'project_manager'
                    )
                    OR public.has_role (auth.uid (), 'qa_manager')
                    OR EXISTS (
                        SELECT 1
                        FROM public.project_assignments pa
                        WHERE
                            pa.project_id = p.id
                            AND pa.user_id = auth.uid ()
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM public.clients c
                        WHERE
                            c.id = p.client_id
                            AND c.user_id = auth.uid ()
                    )
                )
        )
    );

CREATE POLICY "Admins manage stage files" ON public.project_stage_files FOR ALL TO authenticated USING (
    public.has_role (auth.uid (), 'admin')
    OR public.has_role (
        auth.uid (),
        'project_manager'
    )
)
WITH
    CHECK (
        public.has_role (auth.uid (), 'admin')
        OR public.has_role (
            auth.uid (),
            'project_manager'
        )
    );

CREATE TRIGGER update_project_stage_files_updated_at
BEFORE UPDATE ON public.project_stage_files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_project_stage_files_project_id ON public.project_stage_files (project_id);

CREATE INDEX IF NOT EXISTS idx_project_stage_files_stage_key ON public.project_stage_files (stage_key);