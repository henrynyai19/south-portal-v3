-- Let sub-admins continue helping add/edit churches, but reserve destructive
-- church deletion for Main Admin only.

DROP POLICY IF EXISTS "churches admin manage" ON public.churches;
DROP POLICY IF EXISTS "churches main/sub admin insert" ON public.churches;
DROP POLICY IF EXISTS "churches main/sub admin update" ON public.churches;
DROP POLICY IF EXISTS "churches main admin delete" ON public.churches;

CREATE POLICY "churches main/sub admin insert"
ON public.churches
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.is_sub_admin(auth.uid()));

CREATE POLICY "churches main/sub admin update"
ON public.churches
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_sub_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_sub_admin(auth.uid()));

CREATE POLICY "churches main admin delete"
ON public.churches
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
