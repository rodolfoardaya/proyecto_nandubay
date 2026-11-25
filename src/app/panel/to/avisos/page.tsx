import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvisoWhatsapp } from "@/components/AvisoWhatsapp";
import { marcarTurnoAvisado, marcarTareaAvisada, desmarcarTurnoAvisado } from "./actions";
import { hoyIso, fechaLegible } from "@/lib/fecha";
import { ocurrenciasEn, sumarDias, aHHMM, type Turno } from "@/lib/agenda";
import {
  telefonoWhatsapp,
  mensajeTurno,
  mensajeTarea,
} from "@/lib/whatsapp-enlace";

export const metadata = { title: "Avisos por WhatsApp — Ñandubay" };

// Avisos de las próximas 24 horas, para aprobar y mandar a mano desde el
// WhatsApp del consultorio.
//
// No hay envío automático a propósito: la API de Meta obliga a usar
// plantillas aprobadas por ellos —no se puede escribir el mensaje— y cobra
// por conversación. Acá el mensaje se revisa, se corrige si hace falta y sale
// del número de Ñandubay de verdad.
export default async function Avisos() {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const hoy = hoyIso();
  const manana = sumarDias(hoy, 1);

  // ── Turnos de mañana ─────────────────────────────────────────────────────
  // Las series se traen desde antes: un turno semanal cargado hace meses
  // igual cae mañana.
  const { data: turnosRaw } = await supabase
    .from("turnos")
    .select(
      "id, fecha, hora, estado, modalidad, frecuencia, fecha_fin, duracion_minutos, clase, paciente_id, paciente_libre, pacientes(nombre, tutor_nombre, tutor_telefono), tos(nombre)"
    )
    .lte("fecha", manana)
    .neq("estado", "cancelado");

  const series: Turno[] = (turnosRaw ?? []).map((t) => ({
    id: t.id,
    fecha: t.fecha,
    hora: t.hora,
    estado: t.estado,
    modalidad: t.modalidad,
    frecuencia: (t.frecuencia ?? "unica") as Turno["frecuencia"],
    fecha_fin: t.fecha_fin,
    duracion_minutos: t.duracion_minutos ?? 45,
    clase: t.clase ?? "sesion",
    paciente_id: t.paciente_id,
    // @ts-expect-error relación anidada
    paciente: t.pacientes?.nombre ?? t.paciente_libre ?? "—",
  }));

  const { data: excepciones } = await supabase
    .from("turnos_excepciones")
    .select("turno_id, fecha")
    .eq("fecha", manana);

  const deManana = ocurrenciasEn(series, manana, manana, excepciones ?? []);

  // Qué turnos ya se avisaron para esa fecha.
  const { data: yaAvisados } = await supabase
    .from("recordatorios_whatsapp")
    .select("turno_id, fecha_turno")
    .eq("fecha_turno", manana);
  const avisado = new Set((yaAvisados ?? []).map((r) => `${r.turno_id}|${r.fecha_turno}`));

  const datosTurno = new Map(
    (turnosRaw ?? []).map((t) => [
      t.id,
      {
        // @ts-expect-error relación anidada
        tutor: t.pacientes?.tutor_nombre as string | null,
        // @ts-expect-error relación anidada
        telefono: t.pacientes?.tutor_telefono as string | null,
        // @ts-expect-error relación anidada
        to: (t.tos?.nombre as string) ?? "la TO",
      },
    ])
  );

  // ── Tareas que vencen mañana con aviso por WhatsApp ──────────────────────
  const { data: tareas } = await supabase
    .from("tareas")
    .select("id, titulo, descripcion, fecha_limite, hora_limite, telefono_aviso, aviso_enviado_at")
    .eq("avisar_whatsapp", true)
    .neq("estado", "completada")
    .eq("fecha_limite", manana);

  const fechaTexto = fechaLegible(`${manana}T12:00:00`);
  const base = `/panel/${usuario.rol}`;

  const nada = deManana.length === 0 && (tareas ?? []).length === 0;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-green-dark">Avisos por WhatsApp</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Lo que hay que avisar para mañana, {fechaTexto}. Revisá el mensaje,
        tocá «Abrir en WhatsApp» y enviálo desde el número del consultorio.
        Después marcalo como enviado para que no vuelva a aparecer.
      </p>

      {nada && (
        <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-foreground/60 shadow-sm">
          No hay nada para avisar mañana.
        </p>
      )}

      {deManana.length > 0 && (
        <>
          <h2 className="mt-6 font-bold text-green-dark">
            Turnos de mañana ({deManana.length})
          </h2>
          <ul className="mt-3 grid gap-2">
            {deManana.map((t) => {
              const extra = datosTurno.get(t.id);
              const tel = telefonoWhatsapp(extra?.telefono);
              const ya = avisado.has(`${t.id}|${manana}`);
              return (
                <AvisoWhatsapp
                  key={`${t.id}-${manana}`}
                  titulo={t.paciente}
                  subtitulo={
                    `${aHHMM(t.hora)} · ${t.duracion_minutos} min` +
                    (extra?.tutor ? ` · ${extra.tutor}` : "")
                  }
                  telefono={tel}
                  avisado={ya}
                  mensajeInicial={mensajeTurno({ hora: aHHMM(t.hora) })}
                >
                  {ya ? (
                    <form action={desmarcarTurnoAvisado}>
                      <input type="hidden" name="turno_id" value={t.id} />
                      <input type="hidden" name="fecha_turno" value={manana} />
                      <button className="text-xs font-semibold text-blue-mid hover:underline">
                        Volver a pendiente
                      </button>
                    </form>
                  ) : (
                    <form action={marcarTurnoAvisado}>
                      <input type="hidden" name="turno_id" value={t.id} />
                      <input type="hidden" name="fecha_turno" value={manana} />
                      <button className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-green-light/20">
                        Marcar como enviado
                      </button>
                    </form>
                  )}
                </AvisoWhatsapp>
              );
            })}
          </ul>
        </>
      )}

      {(tareas ?? []).length > 0 && (
        <>
          <h2 className="mt-8 font-bold text-green-dark">
            Tareas que vencen mañana ({(tareas ?? []).length})
          </h2>
          <ul className="mt-3 grid gap-2">
            {(tareas ?? []).map((t) => {
              const tel = telefonoWhatsapp(t.telefono_aviso);
              const ya = !!t.aviso_enviado_at;
              return (
                <AvisoWhatsapp
                  key={t.id}
                  titulo={t.titulo}
                  subtitulo={`Vence a las ${String(t.hora_limite).slice(0, 5)}`}
                  telefono={tel}
                  avisado={ya}
                  mensajeInicial={mensajeTarea({
                    titulo: t.titulo,
                    fecha: fechaTexto,
                    hora: String(t.hora_limite).slice(0, 5),
                    detalle: t.descripcion,
                  })}
                >
                  {!ya && (
                    <form action={marcarTareaAvisada}>
                      <input type="hidden" name="tarea_id" value={t.id} />
                      <button className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-green-light/20">
                        Marcar como enviado
                      </button>
                    </form>
                  )}
                </AvisoWhatsapp>
              );
            })}
          </ul>
        </>
      )}

      <p className="mt-6 text-xs text-foreground/50">
        Los mensajes no se envían solos: salen del WhatsApp del consultorio
        cuando vos apretás enviar. <a href={`${base}/agenda`} className="font-bold text-blue-mid hover:underline">Ver la agenda →</a>
      </p>
    </div>
  );
}
