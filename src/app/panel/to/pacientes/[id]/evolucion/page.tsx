import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { FirmaPad } from "@/components/FirmaPad";
import { BotonEnvio } from "@/components/ui/BotonEnvio";
import { archivoUrl } from "@/lib/paciente-vista";
import { agregarNotaEvolucion } from "@/app/panel/to/pacientes/actions";
import { BarraProgreso } from "@/components/BarraProgreso";
import { GraficoEvolucion } from "@/components/GraficoEvolucion";

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
    .select("id, fecha, nota, objetivos_trabajados, progreso, firma_url")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false });

  const notas = await Promise.all(
    (evolucion ?? []).map(async (n) => ({
      ...n,
      firmaSignedUrl: await archivoUrl(supabase, n.firma_url),
    }))
  );

  // Mientras se siga trabajando el mismo objetivo, la barra arranca en el
  // avance de la última nota: se actualiza, no se estima de nuevo. El
  // objetivo también se repite, que es lo habitual sesión a sesión.
  const ultima = (evolucion ?? [])[0];
  const ultimoObjetivo = ultima?.objetivos_trabajados ?? null;
  const ultimoProgreso = typeof ultima?.progreso === "number" ? ultima.progreso : 0;

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
        {/* Imprime datos personales + evolución, nada más. La historia
            completa —con ficha de inicio y acuerdo— sigue estando en la
            portada del paciente. */}
        <div className="flex items-center gap-4">
          <a
            href={`/api/imprimir/evolucion?paciente_id=${id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold text-blue-mid hover:underline"
          >
            Imprimir evolución ↗
          </a>
          <GraficoEvolucion
            puntos={(evolucion ?? [])
              .filter((n) => typeof n.progreso === "number")
              .map((n) => ({
                fecha: n.fecha,
                progreso: n.progreso as number,
                objetivo: n.objetivos_trabajados,
              }))}
          />
        </div>
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
            defaultValue={ultimoObjetivo ?? ""}
            placeholder="Objetivos trabajados"
            className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          />
          <BarraProgreso name="progreso" inicial={ultimoProgreso} objetivoAnterior={ultimoObjetivo} />
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
            {typeof n.progreso === "number" && (
              <div className="mt-2 max-w-xs">
                <div className="flex justify-between text-[11px] font-semibold text-foreground/50">
                  <span>Avance del objetivo</span>
                  <span className="text-green-dark">{n.progreso}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-black/10">
                  <div className="h-2 rounded-full bg-green-mid" style={{ width: `${n.progreso}%` }} />
                </div>
              </div>
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
