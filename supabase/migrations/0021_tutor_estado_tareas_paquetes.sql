-- Actualización grande: datos del tutor, estado del paciente, turnos con
-- clase y valor, progreso de objetivos, tareas y paquetes de sesiones.
--
-- Todo es aditivo. Ninguna columna ni tabla existente se borra ni se
-- renombra, así que la versión anterior del sistema sigue funcionando
-- mientras esta migración está aplicada y el código todavía no.

-- ── 1. Datos del tutor ─────────────────────────────────────────────────────
-- Hasta ahora el tutor vivía dentro del JSON de la ficha de inicio, y sólo
-- para niños. Pasa a ser dato del paciente: es a quién se llama, a quién se
-- le factura y quién firma. Son opcionales porque un adulto puede no tener.
alter table pacientes add column if not exists tutor_nombre text;
alter table pacientes add column if not exists tutor_dni text;
alter table pacientes add column if not exists tutor_telefono text;
alter table pacientes add column if not exists tutor_email text;

-- ── 2. Estado del paciente ─────────────────────────────────────────────────
-- Reemplaza conceptualmente al booleano `activo`, que no distinguía entre
-- quien terminó el tratamiento y quien lo dejó. `activo` se conserva y se
-- mantiene sincronizado por trigger: todas las consultas que hoy filtran por
-- `activo` siguen andando sin tocarlas.
do $$ begin
  create type paciente_estado as enum ('activo', 'en_evaluacion', 'alta', 'baja');
exception when duplicate_object then null; end $$;

alter table pacientes add column if not exists estado paciente_estado not null default 'activo';

-- Los que ya estaban dados de baja conservan ese estado.
update pacientes set estado = 'baja' where activo = false and estado = 'activo';

create or replace function fn_sincronizar_activo() returns trigger
language plpgsql as $$
begin
  -- `activo` pasa a ser un reflejo de `estado`: sólo 'baja' saca al paciente
  -- de los listados. Se mantiene para no romper el código que ya lo usa.
  new.activo := (new.estado <> 'baja');
  if new.estado = 'baja' and new.baja_at is null then
    new.baja_at := now();
  elsif new.estado <> 'baja' then
    new.baja_at := null;
    new.baja_motivo := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sincronizar_activo on pacientes;
create trigger trg_sincronizar_activo
  before insert or update of estado on pacientes
  for each row execute function fn_sincronizar_activo();

-- ── 3. Turnos: clase, valor y turnos sin paciente de la lista ──────────────
do $$ begin
  create type turno_clase as enum ('sesion', 'evaluacion', 'reunion', 'grupal');
exception when duplicate_object then null; end $$;

alter table turnos add column if not exists clase turno_clase not null default 'sesion';
alter table turnos add column if not exists valor_sesion numeric(10, 2);

-- Una reunión o una evaluación puede no ser con un paciente del sistema: hay
-- que poder escribir el nombre a mano. Por eso paciente_id deja de ser
-- obligatorio, pero se exige que haya uno de los dos.
alter table turnos add column if not exists paciente_libre text;
alter table turnos alter column paciente_id drop not null;

do $$ begin
  alter table turnos add constraint turnos_con_paciente
    check (paciente_id is not null or nullif(trim(paciente_libre), '') is not null);
exception when duplicate_object then null; end $$;

-- ── 4. Progreso del objetivo trabajado ─────────────────────────────────────
-- Porcentaje estimado de avance sobre el objetivo de esa nota de evolución.
alter table notas_evolucion add column if not exists progreso smallint
  check (progreso is null or (progreso >= 0 and progreso <= 100));

-- ── 5. Tareas y recordatorios ──────────────────────────────────────────────
do $$ begin
  create type tarea_prioridad as enum ('alta', 'media', 'baja');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tarea_estado as enum ('pendiente', 'en_progreso', 'completada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tarea_categoria as enum (
    'clinico', 'recordatorio', 'cita', 'pago', 'documentacion',
    'preparacion', 'comunicacion', 'administrativo', 'planificacion', 'otras'
  );
exception when duplicate_object then null; end $$;

create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  prioridad tarea_prioridad not null default 'media',
  categoria tarea_categoria,
  fecha_limite date not null,
  hora_limite time not null,
  -- Quién la ejecuta. Puede ser alguien del equipo —"facturar a obras
  -- sociales"— o el propio paciente —"mandar un video comiendo en casa"—, y
  -- como los pacientes no están en `usuarios`, hace falta una columna para
  -- cada caso. Se usa una u otra, nunca las dos.
  responsable_usuario_id uuid references usuarios (id),
  responsable_paciente_id uuid references pacientes (id) on delete set null,
  constraint tareas_un_solo_responsable check (
    responsable_usuario_id is null or responsable_paciente_id is null
  ),
  -- A qué paciente se refiere la tarea, aunque la ejecute el equipo: sirve
  -- para ver todo lo pendiente de un paciente junto.
  paciente_id uuid references pacientes (id) on delete set null,
  avisar_email boolean not null default false,
  email_aviso text,
  avisar_whatsapp boolean not null default false,
  telefono_aviso text,
  aviso_enviado_at timestamptz,
  estado tarea_estado not null default 'pendiente',
  completada_at timestamptz,
  creada_por uuid references usuarios (id),
  created_at timestamptz not null default now()
);

create index if not exists tareas_vencimiento_idx on tareas (fecha_limite, hora_limite);

alter table tareas enable row level security;

create policy "tareas_to_admin" on tareas for all using (
  auth_rol() in ('admin', 'to')
) with check (
  auth_rol() in ('admin', 'to')
);

create policy "tareas_select_direccion" on tareas for select using (
  auth_rol() = 'direccion'
);

-- ── 6. Paquetes de sesiones ────────────────────────────────────────────────
create table if not exists paquetes_sesiones (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  to_id uuid references tos (id),
  cantidad_sesiones integer not null check (cantidad_sesiones > 0),
  precio_total numeric(10, 2) not null,
  fecha_inicio date,
  fecha_fin date,
  pagado boolean not null default false,
  nota text,
  creado_por uuid references usuarios (id),
  created_at timestamptz not null default now()
);

create index if not exists paquetes_paciente_idx on paquetes_sesiones (paciente_id, created_at desc);

alter table paquetes_sesiones enable row level security;

create policy "paquetes_to_admin" on paquetes_sesiones for all using (
  auth_rol() = 'admin'
  or exists (
    select 1 from pacientes p
    where p.id = paquetes_sesiones.paciente_id
      and p.to_asignada_id = auth_to_id()
  )
) with check (
  auth_rol() = 'admin'
  or exists (
    select 1 from pacientes p
    where p.id = paquetes_sesiones.paciente_id
      and p.to_asignada_id = auth_to_id()
  )
);

create policy "paquetes_select_direccion" on paquetes_sesiones for select using (
  auth_rol() = 'direccion'
);
