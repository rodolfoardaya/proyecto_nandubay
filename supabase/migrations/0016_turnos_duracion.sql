-- Duración del turno, en minutos.
--
-- Antes todos ocupaban la misma franja fija. La duración es variable según lo
-- que se trabaje, así que se guarda por turno. La grilla pasa a dividirse
-- cada 5 minutos, que es la unidad mínima con la que se agenda.

alter table turnos add column if not exists duracion_minutos integer not null default 45;

alter table turnos drop constraint if exists turnos_duracion_valida;
alter table turnos add constraint turnos_duracion_valida
  check (duracion_minutos >= 5 and duracion_minutos <= 480 and duracion_minutos % 5 = 0);
