-- Dos datos identificatorios que hasta ahora no tenían dónde ir.
--
-- `cuil`: el CUIL completo, con guiones, tal como se escribe —
-- XX-XXXXXXXX-X. Los 8 dígitos del medio son el DNI, así que `dni` se sigue
-- guardando por separado y derivado del CUIL. No es redundancia: el índice
-- único `pacientes_dni_unico` y la detección de duplicados del alta trabajan
-- sobre `dni`, y los pacientes ya cargados tienen DNI pero todavía no CUIL.
-- Manteniendo los dos, lo viejo sigue funcionando y lo nuevo se completa
-- cuando haya tiempo.
--
-- `obra_social`: la del paciente. No confundir con el estado de pago
-- 'obra_social' de un turno, que es otra cosa: aquel dice cómo se cobra esa
-- sesión, éste dice a qué financiadora pertenece la familia.

alter table pacientes add column if not exists cuil text;
alter table pacientes add column if not exists obra_social text;

comment on column pacientes.cuil is 'CUIL con guiones: XX-XXXXXXXX-X. Los 8 del medio son el DNI.';
comment on column pacientes.obra_social is 'Obra social o prepaga del paciente.';
