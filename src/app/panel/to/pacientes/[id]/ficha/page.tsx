import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SECCIONES_NINOS, SECCIONES_ADULTOS, type DatosFicha } from "@/lib/ficha-fields";
import { FichaCamposEditables } from "@/components/FichaCamposEditables";
import { BotonEnvio } from "@/components/ui/BotonEnvio";
import { archivoUrl } from "@/lib/paciente-vista";
import { actualizarFichaInicio } from "@/app/panel/to/pacientes/actions";

export default async function FichaDelPaciente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireRole("to", "admin", "direccion");
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, tipo")
    .eq("id", id)
    .maybeSingle();
  if (!paciente) return <p className="text-sm text-foreground/60">Paciente no encontrado.</p>;

  const { data: ficha } = await supabase
    .from("fichas_inicio")
    .select("id, datos, archivo_adjunto_url")
    .eq("paciente_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const secciones = paciente.tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  const datos = (ficha?.datos ?? {}) as DatosFicha;
  const adjunto = await archivoUrl(supabase, ficha?.archivo_adjunto_url ?? null);
  const soloLectura = usuario.rol === "direccion";

  if (!ficha) {
    return (
      <p className="text-sm text-foreground/60">
        Este paciente todavía no tiene ficha de inicio cargada.
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-green-dark">Ficha de inicio</h2>
        <a
          href={`/api/imprimir/ficha?paciente_id=${id}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-bold text-blue-mid hover:underline"
        >
          Imprimir ↗
        </a>
      </div>

      {adjunto && (
        <a
          href={adjunto}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-blue-mid hover:underline"
        >
          Ver la planilla escaneada original ↗
        </a>
      )}

      {soloLectura ? (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs text-foreground/50">Solo lectura.</p>
          <FichaCamposEditables secciones={secciones} datosIniciales={datos} />
        </div>
      ) : (
        <form action={actualizarFichaInicio} className="mt-4 grid gap-3">
          <input type="hidden" name="paciente_id" value={id} />
          <input type="hidden" name="ficha_id" value={ficha.id} />
          <input type="hidden" name="tipo" value={paciente.tipo} />

          <div className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold text-foreground/70">
              Reemplazar la planilla escaneada (PDF o foto, opcional)
              <input
                type="file"
                name="archivo_ficha"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                capture="environment"
                className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
              />
            </label>
          </div>

          <FichaCamposEditables secciones={secciones} datosIniciales={datos} />

          <BotonEnvio className="justify-self-start">Guardar cambios en la ficha</BotonEnvio>
        </form>
      )}
    </div>
  );
}
