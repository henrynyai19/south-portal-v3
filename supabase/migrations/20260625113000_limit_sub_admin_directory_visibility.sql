-- Limit directory-style data for sub-admins.
-- Sub-admins should not browse all churches/users, and should only see
-- departments/units connected to their assignments.

CREATE OR REPLACE FUNCTION public.department_matches_user_assignment(
  _user_id UUID,
  _department_id UUID
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
        (ua.scope = 'department' AND ua.department_id IS NOT NULL AND ua.department_id = _department_id)
        OR (
          ua.scope = 'unit'
          AND ua.unit_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.units u
            WHERE u.id = ua.unit_id
              AND u.department_id = _department_id
          )
        )
        OR (
          ua.scope = 'church'
          AND ua.church_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.units u
            WHERE u.church_id = ua.church_id
              AND u.department_id = _department_id
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.unit_matches_user_assignment(
  _user_id UUID,
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
    FROM public.units u
    JOIN public.user_assignments ua
      ON ua.user_id = _user_id
    WHERE u.id = _unit_id
      AND (
        (ua.scope = 'unit' AND ua.unit_id IS NOT NULL AND ua.unit_id = u.id)
        OR (ua.scope = 'department' AND ua.department_id IS NOT NULL AND ua.department_id = u.department_id)
        OR (ua.scope = 'church' AND ua.church_id IS NOT NULL AND ua.church_id = u.church_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.department_matches_user_assignment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unit_matches_user_assignment(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self read"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "departments read all" ON public.departments;
DROP POLICY IF EXISTS "departments visible by assignment" ON public.departments;
CREATE POLICY "departments visible by assignment"
ON public.departments
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR NOT public.is_sub_admin(auth.uid())
  OR (
    public.is_sub_admin(auth.uid())
    AND public.department_matches_user_assignment(auth.uid(), id)
  )
);

DROP POLICY IF EXISTS "units read all" ON public.units;
DROP POLICY IF EXISTS "units visible by assignment" ON public.units;
CREATE POLICY "units visible by assignment"
ON public.units
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR NOT public.is_sub_admin(auth.uid())
  OR (
    public.is_sub_admin(auth.uid())
    AND public.unit_matches_user_assignment(auth.uid(), id)
  )
);
