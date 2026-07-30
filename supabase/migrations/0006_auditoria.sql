-- Auditoría clínica: registro append-only de altas/modificaciones/bajas de
-- las tablas sensibles (historia clínica y turnos) + acciones sin fila
-- asociada (login, logout, impresión, exportación). Cumple con la
-- trazabilidad exigida por la Ley 26.529: el valor anterior de cada fila
-- queda preservado en `datos_anteriores` cada vez que se actualiza o borra,
-- funcionando como historial de versiones sin intervención manual.

create table auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id),
  usuario_nombre text,
  usuario_rol user_role,
  accion text not null, -- 'insert' | 'update' | 'delete' | 'login' | 'logout' | 'impresion' | 'exportacion'
  tabla text, -- tabla afectada; null para acciones sin fila (login, exportación general)
  registro_id uuid,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  detalle text,
  created_at timestamptz not null default now()
);

alter table auditoria enable row level security;

-- Solo admin y dirección pueden leer la auditoría. Nunca se permite
-- update/delete: es un libro de actas append-only.
create policy "auditoria_select_admin_direccion" on auditoria for select using (
  auth_rol() in ('admin', 'direccion')
);

-- Inserts explícitos desde la app (login/logout/impresión/exportación) solo
-- pueden registrarse a nombre del propio usuario autenticado. Los inserts
-- generados por los triggers de abajo corren como security definer y no
-- dependen de esta policy.
create policy "auditoria_insert_propio" on auditoria for insert with check (
  usuario_id = auth.uid()
);

-- Función genérica de auditoría por trigger: guarda snapshot completo de
-- OLD/NEW según la operación, resolviendo el usuario actual por auth.uid().
create or replace function fn_auditoria() returns trigger
language plpgsql security definer as $$
declare
  v_usuario_id uuid;
  v_usuario_nombre text;
  v_usuario_rol user_role;
begin
  select id, nombre, rol into v_usuario_id, v_usuario_nombre, v_usuario_rol
  from usuarios where id = auth.uid();

  insert into auditoria (
    usuario_id, usuario_nombre, usuario_rol, accion, tabla, registro_id,
    datos_anteriores, datos_nuevos
  ) values (
    v_usuario_id,
    v_usuario_nombre,
    v_usuario_rol,
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_auditoria_pacientes
  after insert or update or delete on pacientes
  for each row execute function fn_auditoria();

create trigger trg_auditoria_fichas_inicio
  after insert or update or delete on fichas_inicio
  for each row execute function fn_auditoria();

create trigger trg_auditoria_acuerdos_terapeuticos
  after insert or update or delete on acuerdos_terapeuticos
  for each row execute function fn_auditoria();

create trigger trg_auditoria_notas_evolucion
  after insert or update or delete on notas_evolucion
  for each row execute function fn_auditoria();

create trigger trg_auditoria_turnos
  after insert or update or delete on turnos
  for each row execute function fn_auditoria();

-- Firma manuscrita digital de la TO en cada nota de evolución (la de
-- acuerdos_terapeuticos ya existía desde 0001, sin uso hasta ahora).
alter table notas_evolucion add column if not exists firma_url text;

-- Acceso de solo lectura para el rol "dirección" sobre historia clínica y
-- turnos de todas las TO (se suma a las policies existentes, no las toca).
create policy "pacientes_select_direccion" on pacientes for select using (
  auth_rol() = 'direccion'
);
create policy "fichas_inicio_select_direccion" on fichas_inicio for select using (
  auth_rol() = 'direccion'
);
create policy "acuerdos_select_direccion" on acuerdos_terapeuticos for select using (
  auth_rol() = 'direccion'
);
create policy "evolucion_select_direccion" on notas_evolucion for select using (
  auth_rol() = 'direccion'
);
create policy "turnos_select_direccion" on turnos for select using (
  auth_rol() = 'direccion'
);
