
DROP POLICY IF EXISTS "authenticated can insert historial" ON public.celulares_historial;
CREATE POLICY "users can insert own historial entries"
  ON public.celulares_historial FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

REVOKE EXECUTE ON FUNCTION public.log_celular_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
