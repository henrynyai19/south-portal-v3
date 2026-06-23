
CREATE POLICY "attach upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-attachments' AND auth.uid() = owner);
CREATE POLICY "attach read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-attachments');
CREATE POLICY "attach delete own or admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-attachments' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
