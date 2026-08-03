"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

// Dar de baja NO borra nada: la ficha, el acuerdo, la evolución y el rastro
// de auditoría quedan intactos, como exige la Ley 26.529. Sólo saca al
// paciente de las listas de trabajo, y se puede revertir.
export async function darDeBajaPaciente(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const motivo = String(formData.get("motivo") || "").trim();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre, numero_registro")
    .eq("id", paciente_id)
    .maybeSingle();

  const { error } = await supabase
    .from("pacientes")
    .update({
      activo: false,
      baja_at: new Date().toISOString(),
      baja_motivo: motivo || null,
    })
    .eq("id", paciente_id);

  if (error) throw new Error(error.message);

  await registrarAuditoria(
    "baja_paciente",
    `${paciente?.numero_registro ?? paciente_id} — ${paciente?.nombre ?? ""}${motivo ? ` · motivo: ${motivo}` : ""}`
  );

  revalidatePath("/panel/admin/pacientes");
}

export async function reactivarPaciente(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre, numero_registro")
    .eq("id", paciente_id)
    .maybeSingle();

  const { error } = await supabase
    .from("pacientes")
    .update({ activo: true, baja_at: null, baja_motivo: null })
    .eq("id", paciente_id);

  if (error) throw new Error(error.message);

  await registrarAuditoria(
    "reactivacion_paciente",
    `${paciente?.numero_registro ?? paciente_id} — ${paciente?.nombre ?? ""}`
  );

  revalidatePath("/panel/admin/pacientes");
}
