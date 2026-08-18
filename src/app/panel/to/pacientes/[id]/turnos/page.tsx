import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BotonEnvio } from "@/components/ui/BotonEnvio";
import { crearTurno } from "@/app/panel/to/turnos/actions";
import { hoyIso, ocurrenciasEn, sumarDias } from "@/lib/agenda";

const CAMPO = "rounded-xl border border-black/10 px-4 py-3 outline-blue-mid";

export default async function TurnosDelPaciente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireRole("to", "admin", "direccion");
  const { id } = await params;
  const supabase = await createClient();

  const { data: turnosRaw } = await supabase
    .from("turnos")
    .select("id, fecha, hora, frecuencia, fecha_fin, duracion_minutos, modalidad, estado, link_online")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false });

  const { data: excepciones } = await supabase
    .from("turnos_excepciones")
    .select("turno_id, fecha")
    .in("turno_id", (turnosRaw ?? []).map((t) => t.id));

  const hoy = hoyIso();
  const soloLectura = usuario.rol === "direccion";

  // Un turno semanal es una sola fila que se repite: hay que calcular las
  // fechas en que cae. Sin esto, una serie empezada hace meses aparecía como
  // "turno anterior" aunque siga vigente, y no se veía ninguna próxima.
  const series = (turnosRaw ?? []).map((t) => ({
    id: t.id,
    fecha: t.fecha,
    hora: t.hora,
    estado: t.estado,
    modalidad: t.modalidad,
    frecuencia: (t.frecuencia ?? "unica") as "unica" | "semanal",
    fecha_fin: t.fecha_fin,
    duracion_minutos: t.duracion_minutos ?? 45,
    link_online: t.link_online,
    paciente: "",
    paciente_id: id,
  }));

  const desde = sumarDias(hoy, -120);
  const hasta = sumarDias(hoy, 120);
  const ocurrencias = ocurrenciasEn(series, desde, hasta, excepciones ?? []);

  const porFecha = (a: { fechaOcurrencia: string; hora: string }, b: typeof a) =>
    a.fechaOcurrencia === b.fechaOcurrencia
      ? a.hora.localeCompare(b.hora)
      : a.fechaOcurrencia.localeCompare(b.fechaOcurrencia);

  const proximos = ocurrencias.filter((t) => t.fechaOcurrencia >= hoy).sort(porFecha);
  const pasados = ocurrencias.filter((t) => t.fechaOcurrencia < hoy).sort((a, b) => porFecha(b, a));

  type Fila = (typeof ocurrencias)[number] & { link_online?: string | null };

  const fila = (t: Fila) => (
    <div
      key={t.id + t.fechaOcurrencia}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white px-4 py-3 text-sm shadow-sm"
    >
      <span className="font-semibold text-green-dark">{t.fechaOcurrencia}</span>
      <span className="tabular-nums">{t.hora.slice(0, 5)}</span>
      <span className="text-foreground/60">{t.duracion_minutos} min · <span className="capitalize">{t.modalidad}</span>{t.frecuencia === "semanal" ? " · semanal" : ""}</span>
      {t.link_online && (
        <a href={t.link_online} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-mid hover:underline">
          Link ↗
        </a>
      )}
      <span
        className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${
          t.estado === "confirmado"
            ? "bg-green-light/50 text-green-dark"
            : t.estado === "cancelado"
              ? "bg-orange/20 text-orange"
              : "bg-yellow-main/30 text-[#8a6400]"
        }`}
      >
        {t.estado}
      </span>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-green-dark">Agenda de turnos del paciente</h2>
        {/* Dirección no tiene pantalla de agenda propia: su rol es de
            consulta de la historia clínica. Mostrarle el enlace la mandaba a
            un 404. */}
        {usuario.rol !== "direccion" && (
          <Link href={`/panel/${usuario.rol}/agenda`} className="text-sm font-bold text-blue-mid hover:underline">
            Ver la agenda completa →
          </Link>
        )}
      </div>

      {!soloLectura && (
        <form action={crearTurno} className="mt-4 grid max-w-md gap-3 rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-semibold text-green-dark">Agendar un turno</p>
          <input type="hidden" name="paciente_id" value={id} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="date" name="fecha" defaultValue={hoy} className={CAMPO} />
            {/* De a 5 minutos, que es la unidad mínima de la agenda. */}
            <input required type="time" name="hora" step={300} className={CAMPO} />
          </div>
          <label className="grid gap-1 text-xs font-semibold text-foreground/70">
            Duración del turno (minutos)
            <input
              required
              type="number"
              name="duracion_minutos"
              defaultValue={45}
              min={5}
              max={480}
              step={5}
              className={CAMPO}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <select name="frecuencia" className={CAMPO}>
              <option value="unica">Una sola vez</option>
              <option value="semanal">Todas las semanas (hasta el 31/12)</option>
              </select>
            <select name="modalidad" className={CAMPO}>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </div>
          <input name="link_online" placeholder="Link de videollamada (si es online)" className={CAMPO} />
          <BotonEnvio enCurso="Agendando..." className="justify-self-start">
            Agendar turno
          </BotonEnvio>
        </form>
      )}

      <h3 className="mt-6 font-semibold text-green-dark">Próximos</h3>
      <div className="mt-2 grid gap-2">
        {proximos.map(fila)}
        {proximos.length === 0 && (
          <p className="text-sm text-foreground/60">Sin turnos próximos.</p>
        )}
      </div>

      {pasados.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold text-green-dark">
            Turnos anteriores ({pasados.length})
          </summary>
          <div className="mt-2 grid gap-2">{pasados.map(fila)}</div>
        </details>
      )}
    </div>
  );
}
