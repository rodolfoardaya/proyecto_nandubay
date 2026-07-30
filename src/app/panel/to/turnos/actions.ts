"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { crearEventoCalendar, eliminarEventoCalendar } from "@/lib/google-calendar";

export async function crearTurno(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const fecha = String(formData.get("fecha"));
  const hora = String(formData.get("hora"));
  const tipo = String(formData.get("tipo") || "fijo");
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
    duracionMinutos: 45,
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
