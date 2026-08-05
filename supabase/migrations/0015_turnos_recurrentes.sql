-- Turnos que se repiten.
--
-- Hasta ahora un turno "fijo semanal" era una fila suelta que no se repetía:
-- había que cargarlo de nuevo cada semana. Ahora la fila es la definición de
-- la serie (primera fecha, hora y cada cuánto se repite) y la agenda la
-- expande sola sobre el rango que se está mirando.
--
-- No se materializan las repeticiones como filas: si se materializaran, mover
-- o cancelar la serie obligaría a tocar decenas de registros, y cambiar el
-- horario dejaría medio calendario viejo.

alter table turnos add column if not exists frecuencia text not null default 'unica';
alter table turnos add column if not exists fecha_fin date;

-- 'unica' | 'semanal' | 'quincenal'
alter table turnos drop constraint if exists turnos_frecuencia_valida;
alter table turnos add constraint turnos_frecuencia_valida
  check (frecuencia in ('unica', 'semanal', 'quincenal'));

-- Los turnos ya cargados como fijos pasan a ser semanales; el resto, únicos.
update turnos set frecuencia = 'semanal' where tipo = 'fijo' and frecuencia = 'unica';

-- Cancelar una sola fecha de una serie. Cancelar la serie entera se hace
-- poniendo el turno en estado 'cancelado', que lo saca de la agenda.
create table if not exists turnos_excepciones (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references turnos (id) on delete cascade,
  fecha date not null,
  motivo text,
  creado_por uuid references usuarios (id),
  created_at timestamptz not null default now(),
  unique (turno_id, fecha)
);

create index if not exists turnos_excepciones_fecha_idx
  on turnos_excepciones (fecha);

alter table turnos_excepciones enable row level security;

-- Mismo criterio que los turnos: la TO asignada y el admin gestionan;
-- dirección sólo mira.
create policy "turnos_exc_to_admin" on turnos_excepciones for all using (
  auth_rol() = 'admin'
  or exists (
    select 1 from turnos t
    where t.id = turnos_excepciones.turno_id and t.to_id = auth_to_id()
  )
);

create policy "turnos_exc_select_direccion" on turnos_excepciones for select using (
  auth_rol() = 'direccion'
);
