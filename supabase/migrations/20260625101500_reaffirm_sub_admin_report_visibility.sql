-- Re-affirm report visibility for assigned sub-admins.
-- Main admins can see all reports, sub-admins can see reports matching their
-- assigned church, department, or unit, and submitters can see their own reports.

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

DROP POLICY IF EXISTS "reports visible by role assignment" ON public.reports;
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

DROP POLICY IF EXISTS "attachments visible by report visibility" ON public.report_attachments;
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
