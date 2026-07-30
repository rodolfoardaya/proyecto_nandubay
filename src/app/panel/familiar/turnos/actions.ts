"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function solicitarTurno(formData: FormData) {
  const usuario = await requireRole();
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const fecha = String(formData.get("fecha"));
  const hora = String(formData.get("hora"));
  const modalidad = String(formData.get("modalidad") || "presencial");

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("to_asignada_id, familiar_id")
    .eq("id", paciente_id)
    .single();

  if (!paciente || paciente.familiar_id !== usuario.id) {
    throw new Error("No autorizado para este paciente");
  }

  const { error } = await supabase.from("turnos").insert({
    paciente_id,
    to_id: paciente.to_asignada_id,
    fecha,
    hora,
    tipo: "suelto",
    modalidad,
    estado: "pendiente",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/panel/familiar/turnos");
  revalidatePath("/panel/familiar");
}
