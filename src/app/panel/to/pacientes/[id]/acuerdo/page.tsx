import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AcuerdoTerapeuticoForm } from "@/components/AcuerdoTerapeuticoForm";
import { archivoUrl } from "@/lib/paciente-vista";
import { guardarAcuerdo, actualizarAcuerdo } from "@/app/panel/to/pacientes/actions";

export default async function AcuerdoDelPaciente({
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

  const { data: acuerdo } = await supabase
    .from("acuerdos_terapeuticos")
    .select(
      "id, valor_sesion, forma_pago, duracion_sesion_minutos, modalidad, autoriza_imagenes, observaciones, fecha, firma_url, archivo_adjunto_url"
    )
    .eq("paciente_id", id)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  const firma = await archivoUrl(supabase, acuerdo?.firma_url ?? null);
  const adjunto = await archivoUrl(supabase, acuerdo?.archivo_adjunto_url ?? null);

  if (usuario.rol === "direccion") {
    return (
      <div className="max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-green-dark">Acuerdo terapéutico</h2>
        {acuerdo ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-foreground/50">Valor de sesión</dt><dd className="font-semibold">{acuerdo.valor_sesion ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase text-foreground/50">Forma de pago</dt><dd className="font-semibold">{acuerdo.forma_pago ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase text-foreground/50">Duración</dt><dd className="font-semibold">{acuerdo.duracion_sesion_minutos ?? "—"} min</dd></div>
            <div><dt className="text-xs uppercase text-foreground/50">Modalidad</dt><dd className="font-semibold capitalize">{acuerdo.modalidad ?? "—"}</dd></div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-foreground/60">Sin acuerdo cargado.</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-green-dark">Acuerdo terapéutico</h2>
        <a
          href={`/api/imprimir/acuerdo?paciente_id=${id}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-bold text-blue-mid hover:underline"
        >
          Imprimir ↗
        </a>
      </div>

      {!acuerdo && (
        <p className="mt-2 text-sm text-foreground/60">
          Todavía no hay acuerdo cargado. Completá los datos y guardalo.
        </p>
      )}

      <div className="mt-4">
        <AcuerdoTerapeuticoForm
          action={acuerdo ? actualizarAcuerdo : guardarAcuerdo}
          pacienteId={id}
          acuerdoId={acuerdo?.id}
          tipo={paciente.tipo}
          valoresIniciales={{
            valor_sesion: acuerdo?.valor_sesion != null ? String(acuerdo.valor_sesion) : "",
            forma_pago: acuerdo?.forma_pago ?? "",
            duracion_sesion_minutos:
              acuerdo?.duracion_sesion_minutos != null ? String(acuerdo.duracion_sesion_minutos) : "45",
            modalidad: acuerdo?.modalidad ?? "presencial",
            autoriza_imagenes: acuerdo?.autoriza_imagenes ?? false,
          }}
          firmaActualUrl={firma}
          archivoAdjuntoUrl={adjunto}
          etiquetaSubmit={acuerdo ? "Guardar cambios del acuerdo" : "Guardar acuerdo"}
        />
      </div>
    </div>
  );
}
