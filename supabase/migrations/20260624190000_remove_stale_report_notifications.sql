-- Avoid dead "Report not found" links by removing notifications that point to
-- reports that were deleted or are no longer present.

DELETE FROM public.notifications n
WHERE n.link ~ '^/reports/[0-9a-fA-F-]{36}$'
  AND NOT EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = substring(n.link from '^/reports/([0-9a-fA-F-]{36})$')::uuid
  );

CREATE OR REPLACE FUNCTION public.remove_deleted_report_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE link = '/reports/' || OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_remove_deleted_report_notifications ON public.reports;
CREATE TRIGGER trg_remove_deleted_report_notifications
AFTER DELETE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.remove_deleted_report_notifications();
