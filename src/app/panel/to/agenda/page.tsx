import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AgendaGrilla } from "@/components/AgendaGrilla";
import { FormularioBloqueo } from "@/components/FormularioBloqueo";
import { borrarBloqueo, reactivarFecha } from "./actions";
import {
  FRANJAS,
  fechasDe,
  formatoLargo,
  hoyIso,
  ocurrenciasEn,
  nombreDelMes,
  semanaDe,
  sumarDias,
  type Bloqueo,
  type Franja,
  type Turno,
  type Vista,
} from "@/lib/agenda";

export const metadata = { title: "Agenda de turnos — Ñandubay" };

type Params = Promise<{
  vista?: string;
  fecha?: string;
  franja?: string;
  to?: string;
}>;

export default async function Agenda({ searchParams }: { searchParams: Params }) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();
  const p = await searchParams;

  const vista: Vista =
    p.vista === "semana" || p.vista === "mes" ? p.vista : "dia";
  const franja: Franja = p.franja === "tarde" ? "tarde" : "manana";
  const fecha = p.fecha && /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : hoyIso();

  // Cada TO ve la suya; el admin elige cuál mirar.
  const { data: tos } = await supabase
    .from("tos")
    .select("id, nombre, usuario_id")
    .eq("activo", true)
    .order("nombre");

  const propia = (tos ?? []).find((t) => t.usuario_id === usuario.id);
  const toId =
    usuario.rol === "admin" ? p.to || (tos ?? [])[0]?.id || "" : propia?.id || "";
  const toActual = (tos ?? []).find((t) => t.id === toId);

  const fechas = fechasDe(vista, fecha);
  const desde = fechas[0];
  const hasta = fechas[fechas.length - 1];

  // Las series se traen desde antes del rango: un turno semanal cargado hace
  // meses sigue cayendo esta semana, y filtrar por fecha lo dejaría afuera.
  const { data: turnosRaw } = await supabase
    .from("turnos")
    .select("id, fecha, hora, estado, modalidad, frecuencia, fecha_fin, paciente_id, pacientes(nombre)")
    .eq("to_id", toId)
    .lte("fecha", hasta);

  const series: Turno[] = (turnosRaw ?? []).map((t) => ({
    id: t.id,
    fecha: t.fecha,
    hora: t.hora,
    estado: t.estado,
    modalidad: t.modalidad,
    frecuencia: (t.frecuencia ?? "unica") as Turno["frecuencia"],
    fecha_fin: t.fecha_fin,
    paciente_id: t.paciente_id,
    // @ts-expect-error relación anidada
    paciente: t.pacientes?.nombre ?? "—",
  }));

  const { data: excepciones } = await supabase
    .from("turnos_excepciones")
    .select("turno_id, fecha, motivo")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  const turnos = ocurrenciasEn(series, desde, hasta, excepciones ?? []);

  // Lo cancelado en el rango, para mostrarlo abajo en vez de en la grilla.
  const porId = new Map(series.map((s) => [s.id, s]));
  const canceladosDelDia = (excepciones ?? [])
    .map((e) => ({ ...e, serie: porId.get(e.turno_id) }))
    .filter((e) => e.serie);
  const seriesCanceladas = series.filter((s) => s.estado === "cancelado");

  const { data: bloqueosRaw } = await supabase
    .from("bloqueos_agenda")
    .select("id, motivo, tipo, fecha_desde, fecha_hasta, hora_desde, hora_hasta")
    .eq("to_id", toId)
    .lte("fecha_desde", hasta)
    .gte("fecha_hasta", desde)
    .order("fecha_desde");

  const bloqueos: Bloqueo[] = bloqueosRaw ?? [];
  const base = `/panel/${usuario.rol}`;
  const url = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ vista, fecha, franja, ...(toId ? { to: toId } : {}), ...extra });
    return `${base}/agenda?${q}`;
  };

  const salto = vista === "dia" ? 1 : vista === "semana" ? 7 : 30;
  const titulo =
    vista === "dia"
      ? formatoLargo(fecha)
      : vista === "semana"
        ? `Semana del ${formatoLargo(semanaDe(fecha)[0])}`
        : nombreDelMes(fecha);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-green-dark">Agenda de turnos</h1>
        {usuario.rol === "admin" && (
          <div className="flex flex-wrap gap-1 text-xs">
            {(tos ?? []).map((t) => (
              <Link
                key={t.id}
                href={url({ to: t.id })}
                className={`rounded-full px-3 py-1.5 font-semibold ${
                  t.id === toId ? "bg-green-mid text-white" : "border border-black/10"
                }`}
              >
                {t.nombre}
              </Link>
            ))}
          </div>
        )}
      </div>

      {toActual && usuario.rol === "admin" && (
        <p className="mt-1 text-sm text-foreground/60">Agenda de {toActual.nombre}</p>
      )}

      {/* Controles */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <div className="flex gap-1">
          {(["dia", "semana", "mes"] as Vista[]).map((v) => (
            <Link
              key={v}
              href={url({ vista: v })}
              className={`rounded-full px-3 py-1.5 font-semibold capitalize ${
                v === vista ? "bg-green-mid text-white" : "border border-black/10"
              }`}
            >
              {v === "dia" ? "Día" : v}
            </Link>
          ))}
        </div>

        <div className="flex gap-1">
          {(Object.keys(FRANJAS) as Franja[]).map((f) => (
            <Link
              key={f}
              href={url({ franja: f })}
              className={`rounded-full px-3 py-1.5 font-semibold ${
                f === franja ? "bg-blue-mid text-white" : "border border-black/10"
              }`}
            >
              {FRANJAS[f].etiqueta} {FRANJAS[f].desde}–{FRANJAS[f].hasta}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href={url({ fecha: sumarDias(fecha, -salto) })} className="rounded-lg border border-black/10 px-3 py-1.5">
            ←
          </Link>
          <Link href={url({ fecha: hoyIso() })} className="rounded-lg border border-black/10 px-3 py-1.5 font-semibold">
            Hoy
          </Link>
          <Link href={url({ fecha: sumarDias(fecha, salto) })} className="rounded-lg border border-black/10 px-3 py-1.5">
            →
          </Link>
        </div>
      </div>

      <p className="mt-3 font-bold capitalize text-green-dark">{titulo}</p>

      <AgendaGrilla
        fechas={fechas}
        franja={franja}
        turnos={turnos}
        bloqueos={bloqueos}
        base={base}
      />

      <p className="mt-2 text-xs text-foreground/50">
        Las casillas en blanco están libres. Las verdes tienen turno; las
        naranjas, un bloqueo.
      </p>

      {/* Turnos cancelados: salen de la grilla y quedan acá, para que no se
          pierda el registro de que ese día había turno. */}
      {(canceladosDelDia.length > 0 || seriesCanceladas.length > 0) && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold text-green-dark">Turnos cancelados</h2>

          {canceladosDelDia.length > 0 && (
            <>
              <p className="mt-2 text-xs font-semibold uppercase text-foreground/50">
                Cancelados sólo ese día
              </p>
              <ul className="mt-1 divide-y divide-black/5">
                {canceladosDelDia.map((c) => (
                  <li key={`${c.turno_id}-${c.fecha}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                    <span className="font-semibold text-green-dark">{c.serie!.paciente}</span>
                    <span className="text-foreground/60">
                      {c.fecha} · {c.serie!.hora.slice(0, 5)}
                    </span>
                    {c.motivo && <span className="text-xs italic text-foreground/50">{c.motivo}</span>}
                    <form action={reactivarFecha} className="ml-auto">
                      <input type="hidden" name="turno_id" value={c.turno_id} />
                      <input type="hidden" name="fecha" value={c.fecha} />
                      <button type="submit" className="text-xs font-semibold text-green-mid hover:underline">
                        Restablecer
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}

          {seriesCanceladas.length > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase text-foreground/50">
                Series canceladas por completo
              </p>
              <ul className="mt-1 divide-y divide-black/5">
                {seriesCanceladas.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                    <span className="font-semibold text-green-dark">{s.paciente}</span>
                    <span className="text-foreground/60">
                      {s.hora.slice(0, 5)} · {s.frecuencia}
                    </span>
                    <span className="text-xs text-foreground/50">desde {s.fecha}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Bloqueos */}
      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-green-dark">Bloqueos de agenda</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Feriados, capacitaciones, viajes, licencias. Las horas bloqueadas
          dejan de estar disponibles para turnos.
        </p>

        {bloqueos.length > 0 && (
          <ul className="mt-3 divide-y divide-black/5">
            {bloqueos.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="rounded-full bg-orange/15 px-2 py-0.5 text-xs font-bold capitalize text-orange">
                  {b.tipo}
                </span>
                <span className="font-semibold text-green-dark">{b.motivo}</span>
                <span className="text-xs text-foreground/60">
                  {b.fecha_desde}
                  {b.fecha_hasta !== b.fecha_desde ? ` al ${b.fecha_hasta}` : ""}
                  {b.hora_desde ? ` · ${b.hora_desde.slice(0, 5)}–${b.hora_hasta?.slice(0, 5)}` : " · todo el día"}
                </span>
                <form action={borrarBloqueo} className="ml-auto">
                  <input type="hidden" name="bloqueo_id" value={b.id} />
                  <button type="submit" className="text-xs font-semibold text-orange hover:underline">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <FormularioBloqueo
          esAdmin={usuario.rol === "admin"}
          toId={toId}
          fechaSugerida={fecha}
        />
      </section>
    </div>
  );
}
