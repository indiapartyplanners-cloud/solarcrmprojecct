-- Fix document AFC notification trigger to match notifications schema
-- notifications table columns: id, user_id, title, message, type, link, read, created_at

CREATE OR REPLACE FUNCTION public.notify_document_afc()
RETURNS TRIGGER AS $$
BEGIN
  -- If document state changed to AFC, notify project team
  IF NEW.state = 'afc' AND (OLD.state IS NULL OR OLD.state != 'afc') THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT
      pa.user_id,
      'Document Approved for Construction',
      'Document "' || NEW.name || '" is now AFC',
      'success',
      '/admin/documents'
    FROM public.project_assignments pa
    WHERE pa.project_id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
