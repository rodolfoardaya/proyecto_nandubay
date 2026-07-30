-- Ñandubay — esquema inicial (Fase 1 + Fase 2 + Fase 3)
-- Corresponde al modelo de datos definido en PRD.md §5

create type user_role as enum ('admin', 'teo', 'familiar');
create type paciente_tipo as enum ('nino', 'adulto');
create type turno_tipo as enum ('fijo', 'suelto');
create type turno_modalidad as enum ('presencial', 'online');
create type turno_estado as enum ('pendiente', 'confirmado', 'cancelado', 'ausente');
create type estado_cobro as enum ('pagada', 'a_cobrar', 'vencida');
create type biblioteca_tipo as enum ('video', 'libro', 'documento');
create type galeria_tipo as enum ('foto', 'video');

-- usuarios: espejo de auth.users con rol de aplicación
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text not null,
  rol user_role not null,
  telefono text,
  created_at timestamptz not null default now()
);

-- teos: perfil público/profesional de cada TEO (para landing y asignaciones)
create table teos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios (id) on delete cascade,
  nombre text not null,
  matricula text,
  foto_url text,
  frase_perfil text,
  activo boolean not null default true
);

create table pacientes (
  id uuid primary key default gen_random_uuid(),
  numero_registro text not null unique,
  tipo paciente_tipo not null,
  nombre text not null,
  fecha_nacimiento date,
  dni text,
  familiar_id uuid references usuarios (id),
  teo_asignada_id uuid not null references teos (id),
  created_at timestamptz not null default now()
);

create table fichas_inicio (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  datos jsonb not null default '{}', -- campos según ficha niños/adultos (PRD §4.3)
  archivo_adjunto_url text, -- PDF/foto escaneada, si se migró en papel
  created_at timestamptz not null default now()
);

create table acuerdos_terapeuticos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  valor_sesion numeric(10, 2) not null,
  duracion_sesion_minutos int not null default 45,
  modalidad text,
  firma_url text,
  autoriza_imagenes boolean not null default false,
  fecha timestamptz not null default now()
);

create table notas_evolucion (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  teo_id uuid not null references teos (id),
  fecha date not null default current_date,
  nota text not null,
  objetivos_trabajados text,
  created_at timestamptz not null default now()
);

create table turnos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  teo_id uuid not null references teos (id),
  fecha date not null,
  hora time not null,
  tipo turno_tipo not null default 'fijo',
  modalidad turno_modalidad not null default 'presencial',
  link_online text,
  estado turno_estado not null default 'pendiente',
  created_at timestamptz not null default now()
);

create table facturas (
  id uuid primary key default gen_random_uuid(),
  teo_id uuid not null references teos (id),
  paciente_id uuid not null references pacientes (id),
  archivo_pdf_url text not null,
  fecha_facturacion date,
  monto numeric(10, 2),
  fecha_vencimiento_estimada date,
  estado_cobro estado_cobro not null default 'a_cobrar',
  datos_ocr jsonb, -- resultado crudo de la lectura automática, para auditoría
  revisado_por uuid references usuarios (id),
  created_at timestamptz not null default now()
);

create table galeria_publica (
  id uuid primary key default gen_random_uuid(),
  tipo galeria_tipo not null,
  archivo_url text not null,
  descripcion text,
  publicado_por uuid references usuarios (id),
  created_at timestamptz not null default now()
);

create table biblioteca_interna (
  id uuid primary key default gen_random_uuid(),
  tipo biblioteca_tipo not null,
  archivo_url text not null,
  titulo text not null,
  categoria text,
  created_at timestamptz not null default now()
);

create table contacto_formulario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text,
  motivo text,
  mensaje text,
  created_at timestamptz not null default now()
);

create table recordatorios_whatsapp (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references turnos (id) on delete cascade,
  fecha_envio timestamptz,
  estado_envio text not null default 'pendiente'
);

-- =========================================================
-- Row Level Security
-- =========================================================

alter table usuarios enable row level security;
alter table teos enable row level security;
alter table pacientes enable row level security;
alter table fichas_inicio enable row level security;
alter table acuerdos_terapeuticos enable row level security;
alter table notas_evolucion enable row level security;
alter table turnos enable row level security;
alter table facturas enable row level security;
alter table galeria_publica enable row level security;
alter table biblioteca_interna enable row level security;
alter table contacto_formulario enable row level security;
alter table recordatorios_whatsapp enable row level security;

-- Helper: rol del usuario autenticado
create or replace function auth_rol() returns user_role
language sql stable security definer as $$
  select rol from usuarios where id = auth.uid();
$$;

create or replace function auth_teo_id() returns uuid
language sql stable security definer as $$
  select id from teos where usuario_id = auth.uid();
$$;

-- usuarios: cada uno ve su propia fila; admin ve todas
create policy "usuarios_select_propio_o_admin" on usuarios
  for select using (id = auth.uid() or auth_rol() = 'admin');

-- teos: perfil público (para landing) — lectura abierta
create policy "teos_select_publico" on teos for select using (true);
create policy "teos_insert_admin" on teos for insert with check (auth_rol() = 'admin');

-- pacientes: la TEO ve los suyos; admin ve todos; familiar ve el propio
create policy "pacientes_select" on pacientes for select using (
  auth_rol() = 'admin'
  or teo_asignada_id = auth_teo_id()
  or familiar_id = auth.uid()
);
create policy "pacientes_write" on pacientes for all using (
  auth_rol() = 'admin' or teo_asignada_id = auth_teo_id()
);

-- historia clínica: solo la TEO asignada o admin (nunca familiares)
create policy "fichas_inicio_teo" on fichas_inicio for all using (
  auth_rol() = 'admin'
  or exists (
    select 1 from pacientes p
    where p.id = fichas_inicio.paciente_id and p.teo_asignada_id = auth_teo_id()
  )
);
create policy "acuerdos_teo" on acuerdos_terapeuticos for all using (
  auth_rol() = 'admin'
  or exists (
    select 1 from pacientes p
    where p.id = acuerdos_terapeuticos.paciente_id and p.teo_asignada_id = auth_teo_id()
  )
);
create policy "evolucion_teo" on notas_evolucion for all using (
  auth_rol() = 'admin' or teo_id = auth_teo_id()
);

-- turnos: TEO ve/gestiona los suyos; familiar ve/crea los de su paciente; admin todo
create policy "turnos_select" on turnos for select using (
  auth_rol() = 'admin'
  or teo_id = auth_teo_id()
  or exists (
    select 1 from pacientes p where p.id = turnos.paciente_id and p.familiar_id = auth.uid()
  )
);
create policy "turnos_write_teo_admin" on turnos for all using (
  auth_rol() = 'admin' or teo_id = auth_teo_id()
);
create policy "turnos_insert_familiar" on turnos for insert with check (
  exists (
    select 1 from pacientes p where p.id = turnos.paciente_id and p.familiar_id = auth.uid()
  )
);

-- facturación: exclusiva de cada TEO (y admin ve todas)
create policy "facturas_teo" on facturas for all using (
  auth_rol() = 'admin' or teo_id = auth_teo_id()
);

-- galería pública: lectura abierta a cualquiera (incluso sin login)
create policy "galeria_select_publico" on galeria_publica for select using (true);
create policy "galeria_write_teo_admin" on galeria_publica for insert with check (
  auth_rol() in ('admin', 'teo')
);

-- biblioteca interna: solo TEO/Admin, nunca familiares ni público
create policy "biblioteca_solo_profesionales" on biblioteca_interna for all using (
  auth_rol() in ('admin', 'teo')
);

-- formulario de contacto: cualquiera (incluso anónimo) puede insertar; solo staff lee
create policy "contacto_insert_publico" on contacto_formulario for insert with check (true);
create policy "contacto_select_staff" on contacto_formulario for select using (
  auth_rol() in ('admin', 'teo')
);

-- recordatorios: gestionados por el backend (service role); TEO puede leer los propios
create policy "recordatorios_select_teo" on recordatorios_whatsapp for select using (
  auth_rol() = 'admin'
  or exists (
    select 1 from turnos t where t.id = recordatorios_whatsapp.turno_id and t.teo_id = auth_teo_id()
  )
);
