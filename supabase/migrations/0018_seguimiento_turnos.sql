-- Seguimiento de cada turno: si el paciente asistió y cómo quedó el cobro.
--
-- Va por FECHA y no por turno, porque un turno semanal es una sola fila que
-- se repite: el paciente puede faltar el 12 y venir el 19, y cada fecha tiene
-- su propio estado y su propia nota.
--
-- Es el mismo criterio que `turnos_excepciones`, que también guarda algo que
-- pasa en una fecha puntual de la serie.

create table if not exists turnos_seguimiento (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references turnos (id) on delete cascade,
  fecha date not null,

  -- Sin registrar todavía = null. Se distingue de "vino" y de "faltó".
  asistencia text,
  pago text,

  observacion_asistencia text,
  observacion_pago text,

  registrado_por uuid references usuarios (id),
  updated_at timestamptz not null default now(),

  unique (turno_id, fecha),
  constraint seguimiento_asistencia_valida
    check (asistencia is null or asistencia in ('presente', 'ausente')),
  constraint seguimiento_pago_valido
    check (pago is null or pago in ('pagado', 'adeudado', 'obra_social'))
);

create index if not exists turnos_seguimiento_fecha_idx
  on turnos_seguimiento (fecha);

alter table turnos_seguimiento enable row level security;

create policy "seguimiento_to_admin" on turnos_seguimiento for all using (
  auth_rol() = 'admin'
  or exists (
    select 1 from turnos t
    where t.id = turnos_seguimiento.turno_id and t.to_id = auth_to_id()
  )
);

create policy "seguimiento_select_direccion" on turnos_seguimiento for select using (
  auth_rol() = 'direccion'
);
