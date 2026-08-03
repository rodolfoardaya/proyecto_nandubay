import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { TablaPacientes } from "@/components/TablaPacientes";
import {
  BuscadorPacientes,
  MINIMO_CRITERIOS,
  contarCriterios,
  leerCriterios,
} from "@/components/BuscadorPacientes";

export default async function ListaPacientes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const criterios = leerCriterios(await searchParams);
  const buscando = contarCriterios(criterios) >= MINIMO_CRITERIOS;

  let query = supabase
    .from("pacientes")
    .select("id, numero_registro, nombre, dni, tipo")
    .eq("activo", true)
    .order("numero_registro");

  if (usuario.rol === "to") {
    const { data: to } = await supabase
      .from("tos")
      .select("id")
      .eq("usuario_id", usuario.id)
      .single();
    query = query.eq("to_asignada_id", to?.id);
  }

  // Con dos o más datos se filtra por todos los que se hayan cargado; con
  // uno solo no se busca (ver MINIMO_CRITERIOS).
  if (buscando) {
    if (criterios.nro) query = query.ilike("numero_registro", criterios.nro);
    if (criterios.dni) query = query.ilike("dni", `%${criterios.dni.replace(/\./g, "")}%`);
    if (criterios.nombre) query = query.ilike("nombre", `%${criterios.nombre}%`);
  }

  const { data: pacientes } = await query;
  const base = usuario.rol === "admin" ? "/panel/admin/pacientes" : "/panel/to/pacientes";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-green-dark">Pacientes</h1>
        <Link href={`${base}/nuevo`}>
          <Button variant="cta">+ Nuevo paciente</Button>
        </Link>
      </div>

      <BuscadorPacientes criterios={criterios} base={base} />

      <div className="mt-6">
        {buscando && (
          <p className="mb-2 text-sm text-foreground/60">
            {pacientes?.length ?? 0} resultado{pacientes?.length === 1 ? "" : "s"} para la búsqueda.
          </p>
        )}
        <TablaPacientes pacientes={pacientes ?? []} base={base} />
      </div>
    </div>
  );
}
