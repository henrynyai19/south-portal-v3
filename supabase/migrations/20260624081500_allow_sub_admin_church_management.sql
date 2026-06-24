-- Allow both main admins and sub-admins to manage churches.
-- The UI exposes church management to both roles, so the RLS policy should match.

DROP POLICY IF EXISTS "churches admin manage" ON public.churches;

CREATE POLICY "churches admin manage"
ON public.churches
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_sub_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_sub_admin(auth.uid()));
