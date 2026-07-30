-- El alta de TO debe incluir DNI, además de apellido/nombre y matrícula
-- (ver especificación original: alta de usuario TO).
alter table tos add column if not exists dni text;
