-- El ingreso al sistema debe ser por un nombre de usuario propio, no por
-- email (ver especificación original: usuario RARDAYA, clave ROA@515).
-- El email se conserva para las invitaciones de Supabase Auth y para
-- contacto, pero el login pasa a resolverse por esta columna.
alter table usuarios add column if not exists usuario text unique;
