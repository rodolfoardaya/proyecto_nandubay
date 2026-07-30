-- Columna para trackear el evento sincronizado en Google Calendar de cada turno.
alter table turnos add column if not exists google_event_id text;
