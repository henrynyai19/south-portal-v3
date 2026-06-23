-- Optional unique codes must be NULL when omitted. An empty string is a real
-- value in PostgreSQL, so storing it would allow only one uncoded record.
UPDATE public.churches
SET code = NULL
WHERE btrim(code) = '';

UPDATE public.departments
SET code = NULL
WHERE btrim(code) = '';

UPDATE public.units
SET code = NULL
WHERE btrim(code) = '';
