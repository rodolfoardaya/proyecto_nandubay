"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { PACIENTE_OTRO } from "@/lib/agenda";
import { crearEventoCalendar, eliminarEventoCalendar, actualizarEventoCalendar } from "@/lib/google-calendar";

export async function crearTurno(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const fecha = String(formData.get("fecha"));
  const hora = String(formData.get("hora"));
  // La frecuencia define si el turno se repite; `tipo` se mantiene por
  // compatibilidad con lo ya cargado.
  const frecuencia = String(formData.get("frecuencia") || "unica");
  const tipo = frecuencia === "unica" ? "suelto" : "fijo";
  // La duración es variable y se agenda de a 5 minutos.
  const duracion_minutos = Math.max(5, Math.round(Number(formData.get("duracion_minutos") || 45) / 5) * 5);
  // Una serie semanal se programa hasta el 31/12 del año en que empieza: sin
  // tope arrastraba a los años siguientes agendas que ya no corresponden.
  const fecha_fin = frecuencia === "semanal" ? fecha.slice(0, 4) + "-12-31" : null;
  const modalidad = String(formData.get("modalidad") || "presencial");
  const link_online = String(formData.get("link_online") || "") || null;

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre, numero_registro, to_asignada_id, tos(nombre)")
    .eq("id", paciente_id)
    .single();

  if (!paciente) throw new Error("Paciente no encontrado");

  const { data: turno, error } = await supabase
    .from("turnos")
    .insert({
      paciente_id,
      to_id: paciente.to_asignada_id,
      fecha,
      hora,
      tipo,
      frecuencia,
      duracion_minutos,
      fecha_fin,
      modalidad,
      link_online,
      estado: "confirmado",
    })
    .select("id")
    .single();

  if (error || !turno) throw new Error(error?.message ?? "No se pudo crear el turno");

  const googleEventId = await crearEventoCalendar({
    fecha,
    hora,
    duracionMinutos: duracion_minutos,
    frecuencia: frecuencia as "unica" | "semanal",
    hasta: fecha_fin,
    // Al calendario va el número de registro, no el nombre: ver la nota en
    // google-calendar.ts sobre por qué los datos del paciente no salen afuera.
    pacienteRegistro: paciente.numero_registro,
    modalidad: modalidad as "presencial" | "online",
    /* @ts-expect-error relación anidada */
    toNombre: paciente.tos?.nombre ?? "TO",
  });

  if (googleEventId) {
    await supabase.from("turnos").update({ google_event_id: googleEventId }).eq("id", turno.id);
  }

  revalidatePath(`/panel/${usuario.rol}/pacientes/${paciente_id}`);
  revalidatePath("/panel/to");
  revalidatePath("/panel/admin");
}

export async function confirmarTurno(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();
  const turno_id = String(formData.get("turno_id"));

  await supabase.from("turnos").update({ estado: "confirmado" }).eq("id", turno_id);

  revalidatePath("/panel/to");
  revalidatePath("/panel/admin");
  revalidatePath(`/panel/${usuario.rol}`);
}

export async function cancelarTurno(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();
  const turno_id = String(formData.get("turno_id"));

  const { data: turno } = await supabase
    .from("turnos")
    .select("google_event_id")
    .eq("id", turno_id)
    .single();

  await supabase.from("turnos").update({ estado: "cancelado" }).eq("id", turno_id);

  if (turno?.google_event_id) {
    await eliminarEventoCalendar(turno.google_event_id);
  }

  revalidatePath("/panel/to");
  revalidatePath("/panel/admin");
  revalidatePath(`/panel/${usuario.rol}`);
}

// Editar un turno ya cargado: fecha, hora, duración, frecuencia y modalidad.
// Antes sólo se podía crear o cancelar, así que corregir una duración
// obligaba a borrar y volver a tipear todo.
export async function actualizarTurno(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const turno_id = String(formData.get("turno_id"));
  const fecha = String(formData.get("fecha"));
  const hora = String(formData.get("hora"));
  const frecuencia = String(formData.get("frecuencia") || "unica");
  const modalidad = String(formData.get("modalidad") || "presencial");
  const duracion_minutos = Math.max(
    5,
    Math.round(Number(formData.get("duracion_minutos") || 45) / 5) * 5
  );
  const fecha_fin = frecuencia === "semanal" ? fecha.slice(0, 4) + "-12-31" : null;

  const { data: actual } = await supabase
    .from("turnos")
    .select("google_event_id, pacientes(numero_registro), tos(nombre)")
    .eq("id", turno_id)
    .single();

  const { error } = await supabase
    .from("turnos")
    .update({
      fecha,
      hora,
      duracion_minutos,
      frecuencia,
      fecha_fin,
      modalidad,
      tipo: frecuencia === "unica" ? "suelto" : "fijo",
    })
    .eq("id", turno_id);

  if (error) throw new Error(error.message);

  const nuevoEventoId = await actualizarEventoCalendar(actual?.google_event_id ?? null, {
    fecha,
    hora,
    duracionMinutos: duracion_minutos,
    /* @ts-expect-error relación anidada */
    pacienteRegistro: actual?.pacientes?.numero_registro ?? "Sin registro",
    modalidad: modalidad as "presencial" | "online",
    /* @ts-expect-error relación anidada */
    toNombre: actual?.tos?.nombre ?? "TO",
    frecuencia: frecuencia as "unica" | "semanal",
    hasta: fecha_fin,
  });

  if (nuevoEventoId && nuevoEventoId !== actual?.google_event_id) {
    await supabase.from("turnos").update({ google_event_id: nuevoEventoId }).eq("id", turno_id);
  }

  await registrarAuditoria("edicion_turno", `${turno_id} — ${fecha} ${hora}, ${duracion_minutos} min`);
  revalidatePath(`/panel/${usuario.rol}/agenda`);
}

// ── Alta rápida desde la agenda ────────────────────────────────────────────
// Los botones + TURNO, + EVALUACIÓN y + REUNIÓN usan esta acción. A
// diferencia del alta desde la ficha del paciente, acá se puede elegir la
// clase de turno, cargar el valor de la sesión y anotar a alguien que no está
// en la base —una reunión con otro profesional, por ejemplo—.
export type EstadoTurno = { ok: boolean; mensaje: string } | null;

export async function crearTurnoDesdeAgenda(
  _previo: EstadoTurno,
  formData: FormData
): Promise<EstadoTurno> {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const fecha = String(formData.get("fecha") || "");
  const hora = String(formData.get("hora") || "");
  if (!fecha || !hora) return { ok: false, mensaje: "Cargá la fecha y la hora del turno." };

  // El paciente puede venir de la lista o escribirse a mano con la opción
  // "Otro". Tiene que haber uno de los dos.
  const elegido = String(formData.get("paciente_id") || "");
  const paciente_id = elegido && elegido !== PACIENTE_OTRO ? elegido : null;
  const paciente_libre = String(formData.get("paciente_libre") || "").trim().toUpperCase() || null;
  if (!paciente_id && !paciente_libre) {
    return { ok: false, mensaje: "Elegí un paciente de la lista o escribí un nombre en «Otro»." };
  }

  const clase = String(formData.get("clase") || "sesion");
  const duracion_minutos = Math.max(5, Math.round(Number(formData.get("duracion_minutos") || 45)));
  const frecuencia = String(formData.get("frecuencia") || "unica");
  const fecha_fin = frecuencia === "semanal" ? fecha.slice(0, 4) + "-12-31" : null;

  const valorCrudo = String(formData.get("valor_sesion") || "").trim();
  const valor_sesion = valorCrudo ? Number(valorCrudo) : null;
  if (valor_sesion !== null && !Number.isFinite(valor_sesion)) {
    return { ok: false, mensaje: "El valor de la sesión tiene que ser un número." };
  }

  // La TO a cargo sale del paciente cuando lo hay; si es alguien de afuera,
  // el turno queda a nombre de quien lo carga.
  let to_id: string | null = null;
  let registro: string | null = null;
  if (paciente_id) {
    const { data: p } = await supabase
      .from("pacientes")
      .select("to_asignada_id, numero_registro")
      .eq("id", paciente_id)
      .single();
    to_id = p?.to_asignada_id ?? null;
    registro = p?.numero_registro ?? null;
  }
  if (!to_id) {
    const { data: to } = await supabase
      .from("tos")
      .select("id")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    to_id = to?.id ?? null;
  }
  if (!to_id) {
    return { ok: false, mensaje: "No se pudo determinar la TO a cargo del turno." };
  }

  const { data: turno, error } = await supabase
    .from("turnos")
    .insert({
      paciente_id,
      paciente_libre,
      to_id,
      fecha,
      hora,
      clase,
      valor_sesion,
      duracion_minutos,
      frecuencia,
      fecha_fin,
      tipo: frecuencia === "unica" ? "suelto" : "fijo",
      modalidad: String(formData.get("modalidad") || "presencial"),
      estado: "confirmado",
    })
    .select("id")
    .single();

  if (error || !turno) {
    return { ok: false, mensaje: error?.message ?? "No se pudo crear el turno." };
  }

  // Al calendario de Google va el número de registro, nunca el nombre del
  // paciente. Para alguien de afuera de la base va lo que se escribió: no es
  // un paciente del consultorio.
  const { data: toFila } = await supabase.from("tos").select("nombre").eq("id", to_id).maybeSingle();
  const googleEventId = await crearEventoCalendar({
    fecha,
    hora,
    duracionMinutos: duracion_minutos,
    frecuencia: frecuencia as "unica" | "semanal",
    hasta: fecha_fin,
    pacienteRegistro: registro ?? paciente_libre ?? "Turno",
    modalidad: String(formData.get("modalidad") || "presencial") as "presencial" | "online",
    toNombre: toFila?.nombre ?? "TO",
  });
  if (googleEventId) {
    await supabase.from("turnos").update({ google_event_id: googleEventId }).eq("id", turno.id);
  }

  await registrarAuditoria("alta_turno", `${registro ?? paciente_libre} — ${fecha} ${hora} (${clase})`);
  revalidatePath(`/panel/${usuario.rol}/agenda`);

  return { ok: true, mensaje: `Turno creado para el ${fecha} a las ${hora}.` };
}
