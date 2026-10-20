-- Horario de atención de cada TO, editable desde el panel del administrador.
--
-- Hasta ahora los horarios estaban escritos en el código: mañana de 8 a 13 y
-- tarde de 15 a 21, iguales para todas, y los sábados sólo por la mañana.
-- Pasan a ser dato de cada TO, porque no todas atienden en la misma franja.
--
-- Los valores por omisión son los nuevos horarios del consultorio: mañana de
-- 8 a 13 y tarde de 14 a 21, de lunes a sábado.
alter table tos add column if not exists manana_desde time not null default '08:00';
alter table tos add column if not exists manana_hasta time not null default '13:00';
alter table tos add column if not exists tarde_desde  time not null default '14:00';
alter table tos add column if not exists tarde_hasta  time not null default '21:00';

-- Las TO que ya existían se quedan con el horario nuevo, que es el que pidió
-- el consultorio. Si alguna atiende distinto, se corrige desde el panel.
update tos
set manana_desde = '08:00', manana_hasta = '13:00',
    tarde_desde  = '14:00', tarde_hasta  = '21:00';

-- Que el fin sea posterior al comienzo lo garantiza la base, no la pantalla:
-- un horario invertido dejaría la agenda vacía sin explicar por qué.
do $$ begin
  alter table tos add constraint tos_franjas_coherentes check (
    manana_desde < manana_hasta and tarde_desde < tarde_hasta
  );
exception when duplicate_object then null; end $$;
