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

  const { data: documentos } = await supabase
    .from("documentos_paciente")
    .select("id, tipo, titulo, descripcion, nombre_original, tamano_bytes, archivo_url, created_at")
    .eq("paciente_id", id)
    .eq("vigente", true)
    .order("created_at", { ascending: false });

  const conUrl = await Promise.all(
    (documentos ?? []).map(async (d) => ({
      ...d,
      url: await archivoUrl(supabase, d.archivo_url),
    }))
  );

  return (
    <div className="max-w-3xl">
      <DocumentosPaciente
        pacienteId={id}
        documentos={conUrl}
        soloLectura={usuario.rol === "direccion"}
      />
    </div>
  );
}
