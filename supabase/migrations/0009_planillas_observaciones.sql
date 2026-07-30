-- Digitalización de planillas: observaciones por ítem y adjunto original
-- (PDF o foto) para la ficha de inicio y el acuerdo terapéutico.
--
-- fichas_inicio.datos ya es jsonb libre; a partir de ahora cada clave
-- guarda { "valor": "...", "observacion": "..." } en vez de un string
-- plano. No requiere migrar filas viejas: se leen como { valor: "" } por
-- defecto en el código de la app.

alter table acuerdos_terapeuticos
  add column observaciones jsonb not null default '{}'::jsonb,
  add column archivo_adjunto_url text;
