DROP POLICY IF EXISTS "authenticated can read all celulares" ON public.celulares;
DROP POLICY IF EXISTS "authenticated can update celulares" ON public.celulares;
CREATE POLICY "users can read own celulares" ON public.celulares FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users can update own celulares" ON public.celulares FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated can read historial" ON public.celulares_historial;
CREATE POLICY "users can read own historial" ON public.celulares_historial FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "auth read celulares" ON storage.objects;
DROP POLICY IF EXISTS "auth upload celulares" ON storage.objects;
DROP POLICY IF EXISTS "auth update celulares" ON storage.objects;
DROP POLICY IF EXISTS "auth delete celulares" ON storage.objects;
CREATE POLICY "users read own celulares files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'celulares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users upload own celulares files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'celulares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users update own celulares files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'celulares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users delete own celulares files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'celulares' AND (storage.foldername(name))[1] = auth.uid()::text);

REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_celular_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;