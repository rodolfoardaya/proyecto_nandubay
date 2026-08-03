-- Baja lógica de pacientes.
--
-- La historia clínica no se borra: la Ley 26.529 exige conservarla, y la
-- auditoría de la migración 0006 es append-only justamente por eso. Dar de
-- baja sólo saca al paciente de las listas de trabajo; la ficha, el acuerdo,
-- la evolución y el rastro de auditoría siguen intactos y se pueden consultar
-- reactivándolo.
--
-- Tampoco se toca `numero_registro` ni el contador de la TO: los números son
-- correlativos por TO y no deben reutilizarse nunca, ni siquiera si el
-- paciente se da de baja al poco tiempo de crearse.

alter table pacientes add column if not exists activo boolean not null default true;
alter table pacientes add column if not exists baja_at timestamptz;
alter table pacientes add column if not exists baja_motivo text;

-- Los listados filtran por activo en casi todas las pantallas.
create index if not exists pacientes_activo_idx on pacientes (activo);
