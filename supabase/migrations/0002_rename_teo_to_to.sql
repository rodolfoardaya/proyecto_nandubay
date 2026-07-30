-- Renombra "TEO" a "TO" (Terapista Ocupacional) en toda la base.
-- Los renames preservan los datos existentes y las políticas RLS (Postgres
-- las trackea por dependencia de catálogo, no por texto), salvo el cuerpo
-- de las funciones SQL, que se recrea explícitamente al final.

alter type user_role rename value 'teo' to 'to';

alter table teos rename to tos;

alter table pacientes rename column teo_asignada_id to to_asignada_id;
alter table notas_evolucion rename column teo_id to to_id;
alter table turnos rename column teo_id to to_id;
alter table facturas rename column teo_id to to_id;

alter function auth_teo_id() rename to auth_to_id;

create or replace function auth_to_id() returns uuid
language sql stable security definer as $$
  select id from tos where usuario_id = auth.uid();
$$;

alter policy "teos_select_publico" on tos rename to "tos_select_publico";
alter policy "teos_insert_admin" on tos rename to "tos_insert_admin";
alter policy "fichas_inicio_teo" on fichas_inicio rename to "fichas_inicio_to";
alter policy "acuerdos_teo" on acuerdos_terapeuticos rename to "acuerdos_to";
alter policy "evolucion_teo" on notas_evolucion rename to "evolucion_to";
alter policy "turnos_write_teo_admin" on turnos rename to "turnos_write_to_admin";
alter policy "facturas_teo" on facturas rename to "facturas_to";
alter policy "galeria_write_teo_admin" on galeria_publica rename to "galeria_write_to_admin";
alter policy "recordatorios_select_teo" on recordatorios_whatsapp rename to "recordatorios_select_to";
