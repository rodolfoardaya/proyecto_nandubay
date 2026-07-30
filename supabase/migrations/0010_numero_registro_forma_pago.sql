-- Forma de pago del acuerdo terapéutico (según planilla en papel).
alter table acuerdos_terapeuticos add column if not exists forma_pago text;

-- Numeración de pacientes por TO: cada TO tiene una letra fija asignada
-- (A, B, C... en orden de alta) y un contador propio de pacientes. El
-- número de registro se arma como LETRA + 4 dígitos correlativos por TO
-- (0001 a 9999), asignado solo, sin que nadie lo tipee.

alter table tos add column if not exists letra char(1);
alter table tos add column if not exists contador_pacientes integer not null default 0;

create sequence if not exists tos_letra_seq start 1;

create or replace function generar_letra_to() returns char(1)
language sql as $$
  select chr(64 + nextval('tos_letra_seq')::int);
$$;

alter table tos alter column letra set default generar_letra_to();

-- Backfill: a las TO que ya existan sin letra se les asigna en orden de
-- nombre, y se adelanta la secuencia para que las próximas altas sigan
-- después de las ya asignadas.
with numeradas as (
  select id, row_number() over (order by nombre) as rn
  from tos
  where letra is null
)
update tos set letra = chr(64 + numeradas.rn::int)
from numeradas
where tos.id = numeradas.id;

select setval('tos_letra_seq', (select count(*) from tos), true);

-- El número de registro ya no tiene default fijo: lo arma un trigger que
-- consulta y actualiza el contador de la TO asignada al paciente.
alter table pacientes alter column numero_registro drop default;

create or replace function generar_numero_registro_paciente() returns trigger
language plpgsql security definer as $$
declare
  v_letra char(1);
  v_contador integer;
begin
  if new.numero_registro is not null then
    return new;
  end if;

  update tos set contador_pacientes = contador_pacientes + 1
    where id = new.to_asignada_id
    returning letra, contador_pacientes into v_letra, v_contador;

  if v_letra is null then
    raise exception 'La TO asignada no tiene una letra asignada';
  end if;

  new.numero_registro := v_letra || lpad(v_contador::text, 4, '0');
  return new;
end;
$$;

create trigger trg_generar_numero_registro
  before insert on pacientes
  for each row execute function generar_numero_registro_paciente();
