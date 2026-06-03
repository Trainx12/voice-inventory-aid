
CREATE POLICY "auth read celulares" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'celulares');
CREATE POLICY "auth upload celulares" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'celulares');
CREATE POLICY "auth update celulares" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'celulares');
CREATE POLICY "auth delete celulares" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'celulares');
