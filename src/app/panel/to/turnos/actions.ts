"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
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
    .select("nombre, to_asignada_id, tos(nombre)")
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
    pacienteNombre: paciente.nombre,
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
    .select("google_event_id, pacientes(nombre), tos(nombre)")
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
    pacienteNombre: actual?.pacientes?.nombre ?? "Paciente",
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
