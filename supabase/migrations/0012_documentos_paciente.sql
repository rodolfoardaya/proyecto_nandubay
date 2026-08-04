-- Documentos sueltos del paciente: estudios, informes de otros profesionales,
-- certificados, derivaciones.
--
-- La ficha de inicio y el acuerdo ya guardan su propio escaneo en
-- `archivo_adjunto_url`. Esta tabla es para todo lo demás, que hasta ahora no
-- tenía dónde ir.
--
-- No se borran filas: forman parte de la historia clínica (Ley 26.529), igual
-- que la auditoría de la migración 0006. Para sacar un documento de la vista
-- se lo marca como no vigente.

create table if not exists documentos_paciente (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  tipo text not null default 'estudio',
  titulo text not null,
  descripcion text,
  archivo_url text not null,
  nombre_original text,
  tamano_bytes integer,
  subido_por uuid references usuarios (id),
  vigente boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists documentos_paciente_paciente_idx
  on documentos_paciente (paciente_id, created_at desc);

alter table documentos_paciente enable row level security;

-- Mismo criterio que el resto de la historia clínica: la TO asignada y el
-- admin acceden; dirección solo lee; los familiares nunca.
create policy "documentos_paciente_to_admin" on documentos_paciente for all using (
  auth_rol() = 'admin'
  or exists (
    select 1 from pacientes p
    where p.id = documentos_paciente.paciente_id
      and p.to_asignada_id = auth_to_id()
  )
);

create policy "documentos_paciente_select_direccion" on documentos_paciente for select using (
  auth_rol() = 'direccion'
);
