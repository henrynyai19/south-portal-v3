-- Reports no longer require approval. Any sent report should immediately count
-- as published in dashboard, analytics, and compliance views.

UPDATE public.reports
SET
  status = 'approved',
  approved_at = COALESCE(approved_at, submitted_at, updated_at, created_at, now()),
  rejection_reason = NULL
WHERE status <> 'draft';

CREATE OR REPLACE FUNCTION public.auto_publish_sent_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('submitted', 'under_review', 'rejected') THEN
    NEW.status := 'approved';
  END IF;

  IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
    NEW.approved_at := COALESCE(NEW.submitted_at, now());
  END IF;

  IF NEW.status = 'approved' THEN
    NEW.rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_publish_sent_report ON public.reports;
CREATE TRIGGER trg_auto_publish_sent_report
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.auto_publish_sent_report();

CREATE OR REPLACE FUNCTION public.notify_report_recipients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  SELECT DISTINCT recipient.user_id,
    'New report submitted',
    'A report was submitted and added to your dashboard.',
    'report',
    '/reports/' || NEW.id
  FROM (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'main_admin'

    UNION

    SELECT ua.user_id
    FROM public.user_assignments ua
    JOIN public.user_roles ur
      ON ur.user_id = ua.user_id
      AND ur.role = 'sub_admin'
    WHERE (
      (ua.scope = 'unit' AND ua.unit_id IS NOT NULL AND ua.unit_id = NEW.unit_id)
      OR (ua.scope = 'department' AND ua.department_id IS NOT NULL AND ua.department_id = NEW.department_id)
      OR (ua.scope = 'church' AND ua.church_id IS NOT NULL AND ua.church_id = NEW.church_id)
    )
  ) AS recipient
  WHERE recipient.user_id <> NEW.submitted_by;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_recipients ON public.reports;
CREATE TRIGGER trg_notify_report_recipients
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_report_recipients();

-- Centralize report visibility so sub-admins only see reports that match their
-- assigned church, department, or unit. Main admins are handled separately and
-- remain unrestricted.
CREATE OR REPLACE FUNCTION public.report_matches_user_assignment(
  _user_id UUID,
  _church_id UUID,
  _department_id UUID,
  _unit_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_assignments ua
    WHERE ua.user_id = _user_id
      AND (
        (ua.scope = 'unit' AND ua.unit_id IS NOT NULL AND ua.unit_id = _unit_id)
        OR (ua.scope = 'department' AND ua.department_id IS NOT NULL AND ua.department_id = _department_id)
        OR (ua.scope = 'church' AND ua.church_id IS NOT NULL AND ua.church_id = _church_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.report_matches_user_assignment(UUID, UUID, UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "reports admin read all" ON public.reports;
CREATE POLICY "reports visible by role assignment"
ON public.reports
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR submitted_by = auth.uid()
  OR (
    public.is_sub_admin(auth.uid())
    AND public.report_matches_user_assignment(auth.uid(), church_id, department_id, unit_id)
  )
);

DROP POLICY IF EXISTS "reports update by owner or admin" ON public.reports;
CREATE POLICY "reports update main admin or owner draft"
ON public.reports
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (submitted_by = auth.uid() AND status = 'draft')
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR (submitted_by = auth.uid() AND status IN ('draft', 'approved'))
);

DROP POLICY IF EXISTS "attachments admin/owner/subadmin read" ON public.report_attachments;
CREATE POLICY "attachments visible by report visibility"
ON public.report_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = report_id
      AND (
        public.is_admin(auth.uid())
        OR r.submitted_by = auth.uid()
        OR (
          public.is_sub_admin(auth.uid())
          AND public.report_matches_user_assignment(auth.uid(), r.church_id, r.department_id, r.unit_id)
        )
      )
  )
);
