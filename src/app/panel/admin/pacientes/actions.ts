"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

// Corrección de los datos personales del paciente: lo que se cargó mal en el
// alta y hasta ahora sólo se podía mirar. El número de registro no se toca —
// identifica la historia clínica y sale de la letra de la TO— y de la baja se
// encarga la acción de abajo.
//
// No hace falta registrar la auditoría a mano: los triggers de
// 0006_auditoria.sql guardan el valor anterior de la fila en cada UPDATE, que
// es justamente el historial de correcciones que exige la Ley 26.529.
export async function actualizarDatosPaciente(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const nombre = String(formData.get("nombre") || "").trim();
  const tipo = String(formData.get("tipo") || "");
  const fecha_nacimiento = String(formData.get("fecha_nacimiento") || "") || null;
  // Igual que en el alta: sólo dígitos, para que la comparación con lo ya
  // cargado no falle por un punto de miles de diferencia.
  const dni = String(formData.get("dni") || "").replace(/\D/g, "") || null;

  if (!nombre) throw new Error("El apellido y nombre no puede quedar vacío.");
  if (tipo !== "nino" && tipo !== "adulto") {
    throw new Error("El tipo de ficha tiene que ser niño o adulto.");
  }

  const { error } = await supabase
    .from("pacientes")
    .update({ nombre, tipo, fecha_nacimiento, dni })
    .eq("id", paciente_id);

  if (error) {
    // 23505 es el índice único de 0014: ya hay otro paciente activo con ese
    // DNI, o con ese mismo nombre y fecha de nacimiento.
    if (error.code === "23505") {
      throw new Error(
        "Esos datos ya están cargados en otro paciente activo. Revisá el listado: " +
          "puede ser el mismo paciente cargado dos veces."
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/panel/admin/pacientes");
  revalidatePath(`/panel/admin/pacientes/${paciente_id}`);
}

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
