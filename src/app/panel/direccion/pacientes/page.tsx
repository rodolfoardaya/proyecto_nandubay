import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TablaPacientes } from "@/components/TablaPacientes";
import {
  BuscadorPacientes,
  MINIMO_CRITERIOS,
  contarCriterios,
  leerCriterios,
} from "@/components/BuscadorPacientes";

export default async function ListaPacientesDireccion({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("direccion", "admin");
  const supabase = await createClient();

  const criterios = leerCriterios(await searchParams);
  const buscando = contarCriterios(criterios) >= MINIMO_CRITERIOS;

  const { data: tos } = await supabase.from("tos").select("id, nombre, letra").order("nombre");

  let query = supabase
    .from("pacientes")
    .select("id, numero_registro, nombre, dni, tipo, to_asignada_id")
    .order("numero_registro");

  if (buscando) {
    if (criterios.nro) query = query.ilike("numero_registro", criterios.nro);
    if (criterios.dni) query = query.ilike("dni", `%${criterios.dni.replace(/\./g, "")}%`);
    if (criterios.nombre) query = query.ilike("nombre", `%${criterios.nombre}%`);
  }

  const { data: pacientes } = await query;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">Pacientes por TO</h1>
      <p className="text-sm text-foreground/60">Vista de solo lectura, todas las TO.</p>

      <BuscadorPacientes criterios={criterios} base="/panel/direccion/pacientes" />

      <div className="mt-6 grid gap-8">
        {tos?.map((to) => {
          const propios = (pacientes ?? []).filter((p) => p.to_asignada_id === to.id);
          // Durante una búsqueda solo se muestran las TO con resultados.
          if (buscando && propios.length === 0) return null;
          return (
            <div key={to.id}>
              <h2 className="font-bold text-green-dark">
                {to.nombre}
                {to.letra && <span className="ml-2 text-sm font-normal text-foreground/50">letra {to.letra}</span>}
                <span className="ml-2 text-sm font-normal text-foreground/50">
                  — {propios.length} paciente{propios.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="mt-2">
                <TablaPacientes pacientes={propios} base="/panel/direccion/pacientes" />
              </div>
            </div>
          );
        })}
        {!tos?.length && <p className="text-sm text-foreground/60">Todavía no hay TO cargadas.</p>}
        {buscando && !pacientes?.length && (
          <p className="text-sm text-foreground/60">Ningún paciente coincide con esos datos.</p>
        )}
      </div>
    </div>
  );
}
