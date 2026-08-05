-- Impide cargar dos veces el mismo paciente.
--
-- El control que hace la aplicación antes de guardar no alcanza: si el
-- formulario se manda dos veces casi al mismo tiempo (un doble clic), las dos
-- consultas corren antes de que cualquiera inserte, las dos dan "no existe" y
-- se crean dos historias clínicas. Sólo la base puede garantizarlo.
--
-- Se usan los mismos dos criterios que la aplicación:
--   · el DNI, cuando está cargado;
--   · apellido y nombre junto con la fecha de nacimiento, para los pacientes
--     sin DNI, que es lo habitual en niños chicos.
--
-- Los índices son parciales: un paciente sin DNI o sin fecha de nacimiento no
-- queda alcanzado, porque con esos datos no se puede afirmar que sea el mismo.

-- Alcanzan sólo a los pacientes activos. Es a propósito: la historia clínica
-- de un duplicado ya cargado no se puede borrar (Ley 26.529), así que la
-- forma de resolverlo es darlo de baja. Si el índice mirara también los dados
-- de baja, no habría manera de limpiar lo que ya está.

create unique index if not exists pacientes_dni_unico
  on pacientes (dni)
  where dni is not null and dni <> '' and activo;

create unique index if not exists pacientes_nombre_fecha_unico
  on pacientes (upper(trim(nombre)), fecha_nacimiento)
  where fecha_nacimiento is not null and activo;
