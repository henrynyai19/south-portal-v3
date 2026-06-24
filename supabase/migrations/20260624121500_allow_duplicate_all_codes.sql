-- Codes are used as flexible labels/grouping values in the portal.
-- They should be reusable across multiple records instead of globally unique.

ALTER TABLE public.churches
DROP CONSTRAINT IF EXISTS churches_code_key;

ALTER TABLE public.departments
DROP CONSTRAINT IF EXISTS departments_code_key;
