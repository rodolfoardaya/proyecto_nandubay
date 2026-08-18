import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { confirmarTurno, cancelarTurno } from "./turnos/actions";
import { cancelarUnaFecha } from "./agenda/actions";
import {
  aHHMM,
  formatoCorto,
  hoyIso,
  ocurrenciasEn,
  semanaDe,
  type Turno,
} from "@/lib/agenda";

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-yellow-main/30 text-[#8a6400]",
  confirmado: "bg-green-light/50 text-green-dark",
  cancelado: "bg-orange/20 text-orange",
  ausente: "bg-black/10 text-foreground/60",
};

export default async function PanelTo() {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  // La misma semana que usa el reporte en PDF, de lunes a sábado. Antes esta
  // pantalla mostraba "los próximos 7 días" y el reporte otra cosa, así que
  // no había forma de contrastar una contra el otro.
  const hoy = hoyIso();
  const fechas = semanaDe(hoy);
  const desde = fechas[0];
  const hasta = fechas[fechas.length - 1];

  const { data: to } = await supabase
    .from("tos")
    .select("id")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  // Las series se traen desde antes del rango y se expanden: un turno semanal
  // es una sola fila que se repite, y filtrar por `fecha` dejaba afuera a todo
  // paciente fijo cargado en una semana anterior. Era el mismo error que tenía
  // el reporte de turnos.
  const { data: turnosRaw } = to?.id
    ? await supabase
        .from("turnos")
        .select(
          "id, fecha, hora, modalidad, estado, frecuencia, fecha_fin, duracion_minutos, paciente_id, pacientes(nombre)"
        )
        .eq("to_id", to.id)
        .lte("fecha", hasta)
    : { data: [] };

  const series: Turno[] = (turnosRaw ?? []).map((t) => ({
    id: t.id,
    fecha: t.fecha,
    hora: t.hora,
    estado: t.estado,
    modalidad: t.modalidad,
    frecuencia: (t.frecuencia ?? "unica") as Turno["frecuencia"],
    fecha_fin: t.fecha_fin,
    duracion_minutos: t.duracion_minutos ?? 45,
    paciente_id: t.paciente_id,
    // @ts-expect-error relación anidada
    paciente: t.pacientes?.nombre ?? "—",
  }));

  const { data: excepciones } = await supabase
    .from("turnos_excepciones")
    .select("turno_id, fecha")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  const turnosSemana = ocurrenciasEn(series, desde, hasta, excepciones ?? []).sort(
    (a, b) =>
      a.fechaOcurrencia.localeCompare(b.fechaOcurrencia) || a.hora.localeCompare(b.hora)
  );

  const { count: totalPacientes } = await supabase
    .from("pacientes")
    .select("id", { count: "exact", head: true })
    .eq("to_asignada_id", to?.id ?? "")
    .eq("activo", true);

  const turnosHoy = turnosSemana.filter((t) => t.fechaOcurrencia === hoy);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">
        Agenda de {usuario.nombre.split(" ")[0]}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-bold text-foreground/60">Turnos hoy</p>
          <p className="mt-1 text-3xl font-extrabold text-green-dark">
            {turnosHoy.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-foreground/60">
            Pacientes asignados
          </p>
          <p className="mt-1 text-3xl font-extrabold text-green-dark">
            {totalPacientes ?? 0}
          </p>
        </Card>
      </div>

      <h2 className="mt-8 font-bold text-green-dark">
        Esta semana — del {formatoCorto(desde)} al {formatoCorto(hasta)}
      </h2>
      <div className="mt-3 divide-y divide-black/10 rounded-2xl bg-white shadow-sm">
        {turnosSemana.length > 0 ? (
          turnosSemana.map((t) => (
            <div
              // Una serie aparece una vez por fecha: la clave lleva las dos
              // cosas, o React ve repetido el mismo turno.
              key={`${t.id}|${t.fechaOcurrencia}`}
              className="flex items-center justify-between px-5 py-3"
            >
              <div>
                <p className="font-semibold">
                  {t.fechaOcurrencia} — {aHHMM(t.hora)}
                </p>
                <p className="text-sm text-foreground/60">
                  {t.paciente} · {t.modalidad}
                  {t.frecuencia === "semanal" ? " · semanal" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${ESTADO_COLOR[t.estado]}`}
                >
                  {t.estado}
                </span>
                {t.estado === "pendiente" && (
                  <form action={confirmarTurno}>
                    <input type="hidden" name="turno_id" value={t.id} />
                    <button className="text-xs font-bold text-blue-mid hover:underline">
                      Confirmar
                    </button>
                  </form>
                )}
                {/* Un turno semanal no se cancela entero desde acá: se saltea
                    el día que se está mirando. Cancelar la serie completa se
                    hace desde la agenda, que es donde se ve el alcance. */}
                {t.frecuencia === "semanal" ? (
                  <form action={cancelarUnaFecha}>
                    <input type="hidden" name="turno_id" value={t.id} />
                    <input type="hidden" name="fecha" value={t.fechaOcurrencia} />
                    <button className="text-xs font-bold text-orange hover:underline">
                      Cancelar este día
                    </button>
                  </form>
                ) : (
                  <form action={cancelarTurno}>
                    <input type="hidden" name="turno_id" value={t.id} />
                    <button className="text-xs font-bold text-orange hover:underline">
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="px-5 py-6 text-sm text-foreground/60">
            No hay turnos cargados esta semana.
          </p>
        )}
      </div>
    </div>
  );
}
