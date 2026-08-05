"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

// Bloqueos de agenda: feriados, capacitaciones, viajes, licencias.
//
// Cada bloqueo pertenece a una TO. Para un feriado, que afecta a todas, el
// formulario ofrece "aplicar a todas": se crea una copia por TO, así una
// licencia de una no le cierra la agenda a las demás.
export async function crearBloqueo(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const motivo = String(formData.get("motivo") || "").trim();
  const tipo = String(formData.get("tipo") || "otro");
  const fecha_desde = String(formData.get("fecha_desde") || "");
  const fecha_hasta = String(formData.get("fecha_hasta") || "") || fecha_desde;
  const todoElDia = formData.get("todo_el_dia") === "on";
  const paraTodas = formData.get("para_todas") === "on";
  const toElegida = String(formData.get("to_id") || "");

  if (!motivo || !fecha_desde) {
    throw new Error("Faltan el motivo o la fecha del bloqueo");
  }

  const hora_desde = todoElDia ? null : String(formData.get("hora_desde") || "") || null;
  const hora_hasta = todoElDia ? null : String(formData.get("hora_hasta") || "") || null;

  let destinos: string[] = [];
  if (paraTodas) {
    const { data } = await supabase.from("tos").select("id").eq("activo", true);
    destinos = (data ?? []).map((t) => t.id);
  } else if (toElegida) {
    destinos = [toElegida];
  } else {
    const { data: to } = await supabase
      .from("tos")
      .select("id")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (!to) throw new Error("No se pudo determinar la TO del bloqueo");
    destinos = [to.id];
  }

  const { error } = await supabase.from("bloqueos_agenda").insert(
    destinos.map((to_id) => ({
      to_id,
      motivo,
      tipo,
      fecha_desde,
      fecha_hasta,
      hora_desde,
      hora_hasta,
      creado_por: usuario.id,
    }))
  );

  if (error) throw new Error(error.message);

  await registrarAuditoria(
    "bloqueo_agenda",
    `${motivo} — ${fecha_desde}${fecha_hasta !== fecha_desde ? ` a ${fecha_hasta}` : ""}` +
      (destinos.length > 1 ? ` (todas las TO)` : "")
  );

  revalidatePath(`/panel/${usuario.rol}/agenda`);
}

export async function borrarBloqueo(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const id = String(formData.get("bloqueo_id"));
  const { error } = await supabase.from("bloqueos_agenda").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await registrarAuditoria("bloqueo_agenda_borrado", id);
  revalidatePath(`/panel/${usuario.rol}/agenda`);
}

// Cancelar una sola fecha de una serie: se guarda como excepción, así el
// turno desaparece de esa casilla pero la serie sigue en pie.
export async function cancelarUnaFecha(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const turno_id = String(formData.get("turno_id"));
  const fecha = String(formData.get("fecha"));
  const motivo = String(formData.get("motivo") || "").trim() || null;

  const { error } = await supabase
    .from("turnos_excepciones")
    .upsert({ turno_id, fecha, motivo, creado_por: usuario.id }, { onConflict: "turno_id,fecha" });

  if (error) throw new Error(error.message);

  await registrarAuditoria("cancelacion_turno_fecha", `turno ${turno_id} — ${fecha}`);
  revalidatePath(`/panel/${usuario.rol}/agenda`);
}

// Cancelar la serie completa: el turno pasa a 'cancelado' y deja de expandirse
// en la agenda. No se borra la fila, para que quede el rastro.
export async function cancelarSerie(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const turno_id = String(formData.get("turno_id"));
  const { error } = await supabase
    .from("turnos")
    .update({ estado: "cancelado" })
    .eq("id", turno_id);

  if (error) throw new Error(error.message);

  await registrarAuditoria("cancelacion_turno_serie", `turno ${turno_id}`);
  revalidatePath(`/panel/${usuario.rol}/agenda`);
}

// Deshacer la cancelación de una fecha puntual.
export async function reactivarFecha(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const turno_id = String(formData.get("turno_id"));
  const fecha = String(formData.get("fecha"));

  const { error } = await supabase
    .from("turnos_excepciones")
    .delete()
    .eq("turno_id", turno_id)
    .eq("fecha", fecha);

  if (error) throw new Error(error.message);

  await registrarAuditoria("reactivacion_turno_fecha", `turno ${turno_id} — ${fecha}`);
  revalidatePath(`/panel/${usuario.rol}/agenda`);
}
