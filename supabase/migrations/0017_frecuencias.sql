-- Ajuste de frecuencias.
--
-- Turnos de paciente: sólo una vez o todas las semanas. Se saca "quincenal",
-- que no se usa; lo ya cargado con esa frecuencia pasa a semanal.
--
-- Los turnos semanales se programan hasta el 31/12 del año en que empiezan.
-- Sin tope, una serie se repetía para siempre y arrastraba a los años
-- siguientes agendas que ya no corresponden.

update turnos set frecuencia = 'semanal' where frecuencia = 'quincenal';

alter table turnos drop constraint if exists turnos_frecuencia_valida;
alter table turnos add constraint turnos_frecuencia_valida
  check (frecuencia in ('unica', 'semanal'));

-- A las series semanales ya cargadas que no tienen tope se les pone el 31/12
-- del año en que arrancaron.
update turnos
   set fecha_fin = make_date(extract(year from fecha)::int, 12, 31)
 where frecuencia = 'semanal' and fecha_fin is null;

-- Los bloqueos pasan a poder repetirse. El caso concreto es el tiempo que la
-- TO se reserva cada mes para escribir sus informes: no es un turno de
-- paciente, es agenda propia que hay que dejar ocupada.
alter table bloqueos_agenda add column if not exists frecuencia text not null default 'unica';

alter table bloqueos_agenda drop constraint if exists bloqueos_frecuencia_valida;
alter table bloqueos_agenda add constraint bloqueos_frecuencia_valida
  check (frecuencia in ('unica', 'semanal', 'mensual'));
