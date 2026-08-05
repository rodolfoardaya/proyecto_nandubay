-- Bloqueos de agenda: feriados, capacitaciones, viajes, licencias médicas.
--
-- Cada bloqueo pertenece a una TO. Un feriado, que afecta a todas, se carga
-- una vez por TO: el formulario tiene un atajo que crea una copia para cada
-- una, pero el dato guardado sigue siendo por TO. Así una licencia de una no
-- le cierra la agenda a las otras.
--
-- `hora_desde`/`hora_hasta` en null significan el día entero.

create table if not exists bloqueos_agenda (
  id uuid primary key default gen_random_uuid(),
  to_id uuid not null references tos (id) on delete cascade,
  motivo text not null,
  tipo text not null default 'otro',
  fecha_desde date not null,
  fecha_hasta date not null,
  hora_desde time,
  hora_hasta time,
  creado_por uuid references usuarios (id),
  created_at timestamptz not null default now(),

  constraint bloqueos_rango_fechas check (fecha_hasta >= fecha_desde),
  constraint bloqueos_rango_horas check (
    (hora_desde is null and hora_hasta is null) or
    (hora_desde is not null and hora_hasta is not null and hora_hasta > hora_desde)
  )
);

create index if not exists bloqueos_agenda_to_fecha_idx
  on bloqueos_agenda (to_id, fecha_desde, fecha_hasta);

alter table bloqueos_agenda enable row level security;

-- Cada TO gestiona los suyos; el admin todos; dirección solo mira.
create policy "bloqueos_to_admin" on bloqueos_agenda for all using (
  auth_rol() = 'admin' or to_id = auth_to_id()
);

create policy "bloqueos_select_direccion" on bloqueos_agenda for select using (
  auth_rol() = 'direccion'
);
