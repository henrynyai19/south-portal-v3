-- Allow each submitted report to carry department-specific/custom fields.
-- Existing fixed metric columns remain in place for backwards compatibility.

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb;
