import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DocumentosPaciente } from "@/components/DocumentosPaciente";
import { archivoUrl } from "@/lib/paciente-vista";

export default async function DocumentosDelPaciente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireRole("to", "admin", "direccion");
  const { id } = await params;
  const supabase = await createClient();

  // Se traen también los quitados de la lista, para poder volver a mostrarlos.
  const { data: documentos } = await supabase
    .from("documentos_paciente")
    .select("id, tipo, titulo, descripcion, nombre_original, tamano_bytes, archivo_url, created_at, vigente")
    .eq("paciente_id", id)
    .order("created_at", { ascending: false });

  const vigentes = (documentos ?? []).filter((d) => d.vigente);
  const quitados = (documentos ?? []).filter((d) => !d.vigente);

  // La URL firmada sólo hace falta para los que se muestran: pedir una por
  // cada documento quitado sería trabajo al pedo en cada carga de la página.
  const conUrl = await Promise.all(
    vigentes.map(async (d) => ({
      ...d,
      url: await archivoUrl(supabase, d.archivo_url),
    }))
  );

  return (
    <div className="max-w-3xl">
      <DocumentosPaciente
        pacienteId={id}
        documentos={conUrl}
        quitados={quitados.map((d) => ({ ...d, url: null }))}
        soloLectura={usuario.rol === "direccion"}
      />
    </div>
  );
}
