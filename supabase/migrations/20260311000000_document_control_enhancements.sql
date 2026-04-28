-- Document Control System Enhancements
-- Download history logging and document metadata improvements

-- ============================================================================
-- 1. DOCUMENT DOWNLOAD HISTORY TABLE
-- ============================================================================

CREATE TABLE public.document_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_downloads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_document_downloads_document_id ON public.document_downloads(document_id);
CREATE INDEX idx_document_downloads_user_id ON public.document_downloads(user_id);
CREATE INDEX idx_document_downloads_downloaded_at ON public.document_downloads(downloaded_at);

-- RLS Policies for document downloads
CREATE POLICY "Admins view all download history" ON public.document_downloads 
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'project_manager')
);

CREATE POLICY "Users view own download history" ON public.document_downloads 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Insert download records" ON public.document_downloads 
FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 2. ENHANCED DOCUMENT METADATA
-- ============================================================================

-- Add document type and category fields
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_format TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add metadata to document versions
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS checksum TEXT;
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- ============================================================================
-- 3. DOCUMENT STATE TRANSITION FUNCTION
-- ============================================================================

-- Function to handle document state transitions with validation
CREATE OR REPLACE FUNCTION public.transition_document_state(
  doc_id UUID,
  new_state document_state,
  reviewer_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_state document_state;
BEGIN
  -- Get current state
  SELECT state INTO current_state FROM public.documents WHERE id = doc_id;
  
  -- Validate state transitions
  IF current_state = 'draft' AND new_state NOT IN ('in_review', 'draft') THEN
    RAISE EXCEPTION 'Draft documents can only transition to In Review';
  END IF;
  
  IF current_state = 'in_review' AND new_state NOT IN ('draft', 'afc', 'in_review') THEN
    RAISE EXCEPTION 'Documents in review can only transition to Draft or AFC';
  END IF;
  
  -- Update document state
  UPDATE public.documents 
  SET 
    state = new_state,
    updated_at = now(),
    approved_by = CASE WHEN new_state = 'afc' THEN reviewer_id ELSE approved_by END,
    approved_at = CASE WHEN new_state = 'afc' THEN now() ELSE approved_at END,
    reviewed_by = CASE WHEN new_state = 'in_review' THEN reviewer_id ELSE reviewed_by END,
    reviewed_at = CASE WHEN new_state = 'in_review' THEN now() ELSE reviewed_at END
  WHERE id = doc_id;
  
  -- Log state change in audit
  INSERT INTO public.audit_events (
    user_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) VALUES (
    auth.uid(),
    'document_state_change',
    doc_id,
    'UPDATE',
    jsonb_build_object(
      'old_state', current_state,
      'new_state', new_state,
      'reviewer_id', reviewer_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. FUNCTION TO LOG DOCUMENT DOWNLOADS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_document_download(
  doc_id UUID,
  version_num INT,
  ip_addr TEXT DEFAULT NULL,
  agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  download_id UUID;
BEGIN
  INSERT INTO public.document_downloads (
    document_id,
    version_number,
    user_id,
    ip_address,
    user_agent
  ) VALUES (
    doc_id,
    version_num,
    auth.uid(),
    ip_addr,
    agent
  )
  RETURNING id INTO download_id;
  
  RETURN download_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. VIEW FOR DOCUMENT STATISTICS
-- ============================================================================

CREATE OR REPLACE VIEW public.document_statistics AS
SELECT 
  d.id,
  d.name,
  d.state,
  d.current_version,
  COUNT(DISTINCT dd.id) as total_downloads,
  COUNT(DISTINCT dd.user_id) as unique_downloaders,
  MAX(dd.downloaded_at) as last_download,
  COUNT(DISTINCT dv.id) as version_count
FROM public.documents d
LEFT JOIN public.document_downloads dd ON dd.document_id = d.id
LEFT JOIN public.document_versions dv ON dv.document_id = d.id
GROUP BY d.id, d.name, d.state, d.current_version;

-- Grant access to view
GRANT SELECT ON public.document_statistics TO authenticated;

-- ============================================================================
-- 6. TRIGGER FOR AUTOMATIC STATE NOTIFICATION
-- ============================================================================

-- Notify users when document state changes to AFC
CREATE OR REPLACE FUNCTION public.notify_document_afc()
RETURNS TRIGGER AS $$
BEGIN
  -- If document state changed to AFC, notify project team
  IF NEW.state = 'afc' AND (OLD.state IS NULL OR OLD.state != 'afc') THEN
    -- Notify all project team members
    INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
    SELECT 
      pa.user_id,
      'document_approved',
      'Document Approved for Construction',
      'Document "' || NEW.name || '" is now AFC',
      'document',
      NEW.id
    FROM public.project_assignments pa
    WHERE pa.project_id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_document_afc ON public.documents;
CREATE TRIGGER trigger_document_afc
AFTER UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.notify_document_afc();

-- ============================================================================
-- 7. ENHANCED RLS POLICIES FOR DOCUMENT VERSIONS
-- ============================================================================

-- Engineers can only view versions of AFC documents they have access to
DROP POLICY IF EXISTS "Engineers view AFC doc versions" ON public.document_versions;
CREATE POLICY "Engineers view AFC doc versions" ON public.document_versions 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
    AND d.state IN ('afc', 'as_built')
    AND EXISTS (
      SELECT 1 FROM public.project_assignments pa
      WHERE pa.project_id = d.project_id
      AND pa.user_id = auth.uid()
    )
  )
);

-- Customers can view versions of AFC/As-Built documents for their projects
DROP POLICY IF EXISTS "Customers view approved doc versions" ON public.document_versions;
CREATE POLICY "Customers view approved doc versions" ON public.document_versions 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.projects p ON p.id = d.project_id
    JOIN public.clients c ON c.id = p.client_id
    WHERE d.id = document_versions.document_id
    AND d.state IN ('afc', 'as_built')
    AND c.user_id = auth.uid()
  )
);

COMMENT ON TABLE public.document_downloads IS 'Tracks every document download with user and timestamp for audit purposes';
COMMENT ON FUNCTION public.log_document_download IS 'Logs a document download event with optional IP and user agent';
COMMENT ON FUNCTION public.transition_document_state IS 'Handles document state transitions with validation and audit logging';
