-- Church codes are being used as subgroup labels in the portal.
-- Multiple churches can belong to the same subgroup, so the code field must not be unique.

ALTER TABLE public.churches
DROP CONSTRAINT IF EXISTS churches_code_key;
