
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('main_admin', 'sub_admin', 'submitter');
CREATE TYPE public.report_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected');
CREATE TYPE public.assignment_scope AS ENUM ('church', 'department', 'unit');

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'main_admin'); $$;

CREATE OR REPLACE FUNCTION public.is_sub_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'sub_admin'); $$;

-- ============ CHURCHES ============
CREATE TABLE public.churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  region TEXT DEFAULT 'South Group',
  location TEXT,
  pastor_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.churches TO authenticated;
GRANT ALL ON public.churches TO service_role;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_churches_updated BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DEPARTMENTS ============
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ UNITS ============
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  leader_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, department_id, church_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_units_updated BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ASSIGNMENTS (which church/dept/unit a sub-admin or submitter belongs to) ============
CREATE TABLE public.user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope public.assignment_scope NOT NULL,
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_assignments_user ON public.user_assignments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_assignments TO authenticated;
GRANT ALL ON public.user_assignments TO service_role;
ALTER TABLE public.user_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: get user's assigned church / dept / unit ids
CREATE OR REPLACE FUNCTION public.user_church_ids(_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT DISTINCT church_id FROM public.user_assignments WHERE user_id = _user_id AND church_id IS NOT NULL; $$;

CREATE OR REPLACE FUNCTION public.user_department_ids(_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT DISTINCT department_id FROM public.user_assignments WHERE user_id = _user_id AND department_id IS NOT NULL; $$;

CREATE OR REPLACE FUNCTION public.user_unit_ids(_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT DISTINCT unit_id FROM public.user_assignments WHERE user_id = _user_id AND unit_id IS NOT NULL; $$;

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  status public.report_status NOT NULL DEFAULT 'draft',
  -- period
  reporting_period TEXT,
  week_number INT,
  month INT,
  year INT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- membership
  total_attendance INT DEFAULT 0,
  male_attendance INT DEFAULT 0,
  female_attendance INT DEFAULT 0,
  children_attendance INT DEFAULT 0,
  first_timers INT DEFAULT 0,
  new_converts INT DEFAULT 0,
  holy_ghost_receivers INT DEFAULT 0,
  active_members INT DEFAULT 0,
  -- cell ministry
  num_cells INT DEFAULT 0,
  cell_meetings_held INT DEFAULT 0,
  avg_cell_attendance INT DEFAULT 0,
  active_cell_leaders INT DEFAULT 0,
  -- evangelism
  num_outreaches INT DEFAULT 0,
  souls_reached INT DEFAULT 0,
  souls_won INT DEFAULT 0,
  follow_ups INT DEFAULT 0,
  -- finance
  offering_amount NUMERIC(14,2) DEFAULT 0,
  partnership_amount NUMERIC(14,2) DEFAULT 0,
  special_giving NUMERIC(14,2) DEFAULT 0,
  -- programs
  programs_held INT DEFAULT 0,
  special_events INT DEFAULT 0,
  outreach_programs INT DEFAULT 0,
  prayer_meetings INT DEFAULT 0,
  -- notes
  notes TEXT,
  -- workflow
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_church ON public.reports(church_id);
CREATE INDEX idx_reports_dept ON public.reports(department_id);
CREATE INDEX idx_reports_unit ON public.reports(unit_id);
CREATE INDEX idx_reports_submitter ON public.reports(submitted_by);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_date ON public.reports(report_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ATTACHMENTS ============
CREATE TABLE public.report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_report ON public.report_attachments(report_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_attachments TO authenticated;
GRANT ALL ON public.report_attachments TO service_role;
ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, is_read);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_sub_admin(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "roles read own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_assignments
CREATE POLICY "assignments read own or admin" ON public.user_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "assignments admin manage" ON public.user_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- churches: all authenticated read, only admin manage
CREATE POLICY "churches read all" ON public.churches FOR SELECT TO authenticated USING (true);
CREATE POLICY "churches admin manage" ON public.churches FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- departments
CREATE POLICY "departments read all" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments admin manage" ON public.departments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- units
CREATE POLICY "units read all" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units admin manage" ON public.units FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- reports
CREATE POLICY "reports admin read all" ON public.reports FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR submitted_by = auth.uid()
    OR (public.is_sub_admin(auth.uid()) AND (
      church_id IN (SELECT public.user_church_ids(auth.uid()))
      OR department_id IN (SELECT public.user_department_ids(auth.uid()))
      OR unit_id IN (SELECT public.user_unit_ids(auth.uid()))
    ))
  );
CREATE POLICY "reports submitter insert" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "reports update by owner or admin" ON public.reports FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (submitted_by = auth.uid() AND status IN ('draft','rejected'))
    OR (public.is_sub_admin(auth.uid()) AND (
      church_id IN (SELECT public.user_church_ids(auth.uid()))
      OR department_id IN (SELECT public.user_department_ids(auth.uid()))
      OR unit_id IN (SELECT public.user_unit_ids(auth.uid()))
    ))
  );
CREATE POLICY "reports delete admin or owner draft" ON public.reports FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR (submitted_by = auth.uid() AND status = 'draft'));

-- report_attachments: follow report visibility
CREATE POLICY "attachments read via report" ON public.report_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND (
    public.is_admin(auth.uid())
    OR r.submitted_by = auth.uid()
    OR (public.is_sub_admin(auth.uid()) AND (
      r.church_id IN (SELECT public.user_church_ids(auth.uid()))
      OR r.department_id IN (SELECT public.user_department_ids(auth.uid()))
      OR r.unit_id IN (SELECT public.user_unit_ids(auth.uid()))
    ))
  )));
CREATE POLICY "attachments insert by owner" ON public.report_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "attachments delete admin or owner" ON public.report_attachments FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR uploaded_by = auth.uid());

-- notifications: per-user
CREATE POLICY "notif read own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif insert admin or self" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "notif delete own or admin" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- audit_logs: admins read all, users read own
CREATE POLICY "audit read admin or own" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "audit insert any auth" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============ NEW USER TRIGGER: create profile + seed main admin ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-promote the seeded admin email
  IF lower(NEW.email) = 'henrynyai19@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'main_admin')
    ON CONFLICT DO NOTHING;
  ELSE
    -- Default new users to 'submitter'; admins can change later
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'submitter')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
