"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

// Marcar un aviso como enviado no manda nada: el mensaje sale del WhatsApp
// del consultorio, a mano. Esto sólo deja constancia de que ya se avisó, para
// que no vuelva a aparecer en la lista ni se le escriba dos veces a la misma
// familia.
function refrescar(rol: string) {
  revalidatePath(`/panel/${rol}/avisos`);
  revalidatePath(`/panel/${rol}`);
}

export async function marcarTurnoAvisado(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const turno_id = String(formData.get("turno_id") || "");
  const fecha_turno = String(formData.get("fecha_turno") || "");
  if (!turno_id || !fecha_turno) return;

  // El índice único de la migración 0023 impide duplicar el mismo turno en la
  // misma fecha; si ya estaba, no pasa nada.
  await supabase
    .from("recordatorios_whatsapp")
    .upsert(
      {
        turno_id,
        fecha_turno,
        fecha_envio: new Date().toISOString(),
        estado_envio: "enviado",
      },
      { onConflict: "turno_id,fecha_turno" }
    );

  await registrarAuditoria("aviso_turno", `${turno_id} — ${fecha_turno}`);
  refrescar(usuario.rol);
}

export async function marcarTareaAvisada(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const tarea_id = String(formData.get("tarea_id") || "");
  if (!tarea_id) return;

  await supabase
    .from("tareas")
    .update({ aviso_enviado_at: new Date().toISOString() })
    .eq("id", tarea_id);

  await registrarAuditoria("aviso_tarea", tarea_id);
  refrescar(usuario.rol);
}

// Volver a dejarlo pendiente, por si se marcó por error.
export async function desmarcarTurnoAvisado(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  await supabase
    .from("recordatorios_whatsapp")
    .delete()
    .eq("turno_id", String(formData.get("turno_id") || ""))
    .eq("fecha_turno", String(formData.get("fecha_turno") || ""));

  refrescar(usuario.rol);
}
