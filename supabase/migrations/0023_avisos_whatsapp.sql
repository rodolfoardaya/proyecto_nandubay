-- Avisos de WhatsApp que se aprueban y se envían a mano desde el WhatsApp
-- del consultorio.
--
-- La tabla ya existía, pensada para un envío automático por la API de Meta
-- que nunca se configuró. Le faltan dos cosas para servir acá.

-- 1. La fecha del turno avisado.
--
-- Un turno semanal es una sola fila que se repite: sin la fecha, marcar como
-- avisado el turno del martes dejaría marcados también todos los martes que
-- vienen. El aviso es de una fecha concreta, no de la serie.
alter table recordatorios_whatsapp add column if not exists fecha_turno date;

-- Un mismo turno en una misma fecha se avisa una sola vez. Es la red que
-- impide mandar dos veces el mismo mensaje a una familia si alguien aprieta
-- el botón dos veces o si dos personas miran la pantalla a la vez.
create unique index if not exists recordatorios_turno_fecha_idx
  on recordatorios_whatsapp (turno_id, fecha_turno);

-- 2. Permiso de escritura.
--
-- La tabla sólo tenía lectura, porque la idea original era que escribiera el
-- proceso automático con la clave de servicio. Ahora quien marca el aviso
-- como enviado es la TO desde la pantalla, así que necesita poder escribir
-- sobre los turnos que son suyos.
-- Envuelta para que volver a correr la migración no falle: si la política ya
-- está, se ignora en vez de cortar todo el script.
do $$ begin
create policy "recordatorios_write_to_admin" on recordatorios_whatsapp for all using (
  auth_rol() = 'admin'
  or exists (
    select 1 from turnos t
    where t.id = recordatorios_whatsapp.turno_id and t.to_id = auth_to_id()
  )
) with check (
  auth_rol() = 'admin'
  or exists (
    select 1 from turnos t
    where t.id = recordatorios_whatsapp.turno_id and t.to_id = auth_to_id()
  )
);
exception when duplicate_object then null; end $$;
