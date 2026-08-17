-- La tabla `tos` quedó desde el inicio (0001_init.sql) con dos políticas
-- solamente: lectura pública, para la landing, e inserción del admin. Sin
-- política de UPDATE ni de DELETE, RLS no rechaza con un error: descarta las
-- filas en silencio. Un UPDATE que no alcanza ninguna fila es un UPDATE
-- exitoso que afectó cero filas, y PostgREST devuelve 204.
--
-- Por eso, en el panel de admin, "Editar datos", "Dar de baja"/"Reactivar" y
-- el cambio de foto de una TO decían que habían guardado y no guardaban nada,
-- y por eso no había manera de sacar del sistema una TO cargada de prueba.
--
-- Se agregan las dos políticas que faltaban, solo para admin.

create policy "tos_update_admin" on tos for update
  using (auth_rol() = 'admin')
  with check (auth_rol() = 'admin');

create policy "tos_delete_admin" on tos for delete
  using (auth_rol() = 'admin');

-- Nota sobre el borrado: las claves foráneas de pacientes, turnos,
-- notas_evolucion y facturas contra tos(id) no tienen ON DELETE, así que son
-- RESTRICT. Una TO con historia clínica asociada no se puede borrar aunque el
-- admin lo intente, y eso es deliberado: esa historia debe conservarse (Ley
-- 26.529). Para esos casos está la baja lógica. Solo bloqueos_agenda cae con
-- la TO, porque no es información clínica.
