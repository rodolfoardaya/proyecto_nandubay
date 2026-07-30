-- Buckets privados para PDFs de facturas y adjuntos de historia clínica.
insert into storage.buckets (id, name, public)
values ('facturas', 'facturas', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Solo TO/Admin pueden subir y leer facturas.
create policy "facturas_storage_rw" on storage.objects for all using (
  bucket_id = 'facturas' and auth_rol() in ('admin', 'to')
) with check (
  bucket_id = 'facturas' and auth_rol() in ('admin', 'to')
);

-- Documentos (ej. fichas escaneadas): TO/Admin suben y leen.
create policy "documentos_storage_rw" on storage.objects for all using (
  bucket_id = 'documentos' and auth_rol() in ('admin', 'to')
) with check (
  bucket_id = 'documentos' and auth_rol() in ('admin', 'to')
);
