
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'project_manager', 'engineer', 'qa_manager', 'customer');

-- Create project stage enum
CREATE TYPE public.project_stage AS ENUM (
  'lead_created', 'proposal_approved', 'contract_signed', 'design_started',
  'design_approved', 'build_started', 'qa_passed', 'commissioned', 'closeout_delivered'
);

-- Create project type enum
CREATE TYPE public.project_type AS ENUM ('rooftop', 'ground_mount', 'carport');

-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');

-- Create document state enum
CREATE TYPE public.document_state AS ENUM ('draft', 'in_review', 'afc', 'as_built');

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Sites
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_type project_type NOT NULL DEFAULT 'rooftop',
  stage project_stage NOT NULL DEFAULT 'lead_created',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  capacity_kw DOUBLE PRECISION,
  estimated_cost NUMERIC(12,2),
  start_date DATE,
  target_completion DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Project team assignments
CREATE TABLE public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, role)
);
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- Milestones
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  stage project_stage,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority INT NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  state document_state NOT NULL DEFAULT 'draft',
  current_version INT NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Document versions
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Checklist templates
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- Checklist runs
CREATE TABLE public.checklist_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  completed_items JSONB NOT NULL DEFAULT '[]',
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_runs ENABLE ROW LEVEL SECURITY;

-- Photos
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Daily logs
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  work_hours DOUBLE PRECISION,
  weather TEXT,
  issues TEXT,
  materials TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Audit events
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('project-photos', 'project-photos', true);

-- RLS POLICIES

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Organizations
CREATE POLICY "Orgs viewable by authenticated" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage orgs" ON public.organizations FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Clients
CREATE POLICY "Admins PMs can view all clients" ON public.clients FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager') OR user_id = auth.uid()
);
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Sites
CREATE POLICY "Sites viewable by authenticated" ON public.sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sites" ON public.sites FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Projects
CREATE POLICY "Admins PMs see all projects" ON public.projects FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'qa_manager')
);
CREATE POLICY "Engineers see assigned projects" ON public.projects FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.project_assignments WHERE project_id = projects.id AND user_id = auth.uid())
);
CREATE POLICY "Customers see own projects" ON public.projects FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients WHERE id = projects.client_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Project assignments
CREATE POLICY "View assignments" ON public.project_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage assignments" ON public.project_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Milestones
CREATE POLICY "View milestones" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage milestones" ON public.milestones FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Tasks
CREATE POLICY "View tasks" ON public.tasks FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager') OR assigned_to = auth.uid()
);
CREATE POLICY "Admins manage tasks" ON public.tasks FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));
CREATE POLICY "Engineers update assigned tasks" ON public.tasks FOR UPDATE USING (assigned_to = auth.uid());

-- Documents
CREATE POLICY "Admins PMs view all docs" ON public.documents FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'qa_manager')
);
CREATE POLICY "Engineers see AFC docs" ON public.documents FOR SELECT TO authenticated USING (
  state = 'afc' AND EXISTS (SELECT 1 FROM public.project_assignments WHERE project_id = documents.project_id AND user_id = auth.uid())
);
CREATE POLICY "Customers see approved docs" ON public.documents FOR SELECT TO authenticated USING (
  (state = 'afc' OR state = 'as_built') AND EXISTS (SELECT 1 FROM public.clients c JOIN public.projects p ON p.client_id = c.id WHERE p.id = documents.project_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admins manage docs" ON public.documents FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Document versions
CREATE POLICY "View doc versions" ON public.document_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage doc versions" ON public.document_versions FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- Checklist templates
CREATE POLICY "View templates" ON public.checklist_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage templates" ON public.checklist_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Checklist runs
CREATE POLICY "View checklist runs" ON public.checklist_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Engineers manage checklist runs" ON public.checklist_runs FOR ALL TO authenticated USING (true);

-- Photos
CREATE POLICY "View photos" ON public.photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Engineers upload photos" ON public.photos FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'project_manager')
);

-- Daily logs
CREATE POLICY "View daily logs" ON public.daily_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager') OR logged_by = auth.uid()
);
CREATE POLICY "Engineers create daily logs" ON public.daily_logs FOR INSERT TO authenticated WITH CHECK (logged_by = auth.uid());
CREATE POLICY "Engineers update own logs" ON public.daily_logs FOR UPDATE USING (logged_by = auth.uid());

-- Audit events
CREATE POLICY "Admins view audit" ON public.audit_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System insert audit" ON public.audit_events FOR INSERT TO authenticated WITH CHECK (true);

-- Storage policies
CREATE POLICY "Authenticated can view project docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-documents');
CREATE POLICY "Admins PMs upload docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-documents');
CREATE POLICY "View project photos" ON storage.objects FOR SELECT USING (bucket_id = 'project-photos');
CREATE POLICY "Upload project photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-photos');

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON public.checklist_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_checklist_runs_updated_at BEFORE UPDATE ON public.checklist_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
