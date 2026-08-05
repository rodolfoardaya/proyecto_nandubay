import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { FirmaPad } from "@/components/FirmaPad";
import { BotonEnvio } from "@/components/ui/BotonEnvio";
import { archivoUrl } from "@/lib/paciente-vista";
import { agregarNotaEvolucion } from "@/app/panel/to/pacientes/actions";

export default async function EvolucionDelPaciente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireRole("to", "admin", "direccion");
  const { id } = await params;
  const supabase = await createClient();

  const { data: evolucion } = await supabase
    .from("notas_evolucion")
    .select("id, fecha, nota, objetivos_trabajados, firma_url")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false });

  const notas = await Promise.all(
    (evolucion ?? []).map(async (n) => ({
      ...n,
      firmaSignedUrl: await archivoUrl(supabase, n.firma_url),
    }))
  );

  const soloLectura = usuario.rol === "direccion";

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-green-dark">
          Historia clínica — evolución
          <span className="ml-2 text-sm font-normal text-foreground/50">
            {notas.length} {notas.length === 1 ? "nota" : "notas"}
          </span>
        </h2>
        <a
          href={`/api/backup?paciente_id=${id}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-bold text-blue-mid hover:underline"
        >
          Imprimir historia ↗
        </a>
      </div>

      {!soloLectura && (
        <form
          action={agregarNotaEvolucion}
          className="mt-4 grid gap-3 rounded-2xl bg-white p-5 shadow-sm"
        >
          <p className="font-semibold text-green-dark">Agregar nota de la sesión</p>
          <input type="hidden" name="paciente_id" value={id} />
          <textarea
            required
            name="nota"
            rows={3}
            placeholder="Qué se trabajó, cómo respondió, observaciones"
            className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          />
          <input
            name="objetivos_trabajados"
            placeholder="Objetivos trabajados"
            className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          />
          <FirmaPad name="firma" />
          <BotonEnvio variant="secondary" enCurso="Agregando..." className="justify-self-start">
            Agregar nota
          </BotonEnvio>
        </form>
      )}

      <div className="mt-6 grid gap-3">
        {notas.map((n) => (
          <Card key={n.id}>
            <p className="text-xs font-bold text-foreground/50">{n.fecha}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{n.nota}</p>
            {n.objetivos_trabajados && (
              <p className="mt-1 text-sm text-blue-mid">Objetivos: {n.objetivos_trabajados}</p>
            )}
            {n.firmaSignedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={n.firmaSignedUrl}
                alt="Firma de la TO"
                className="mt-2 h-12 rounded border border-black/10 bg-white"
              />
            )}
          </Card>
        ))}
        {notas.length === 0 && (
          <p className="text-sm text-foreground/60">
            Todavía no hay notas de evolución para este paciente.
          </p>
        )}
      </div>
    </div>
  );
}
