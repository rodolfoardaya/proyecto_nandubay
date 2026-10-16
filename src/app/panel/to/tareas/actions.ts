"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { leerResponsable } from "@/lib/tareas";

export type EstadoTareaForm = { ok: boolean; mensaje: string } | null;

// Los motivos por los que una tarea no se puede guardar se devuelven, no se
// lanzan: en producción Next oculta el texto de las excepciones y la pantalla
// se cae sin explicar nada.
function refrescar() {
  revalidatePath("/panel/to/tareas");
  revalidatePath("/panel/admin/tareas");
  revalidatePath("/panel/to");
  revalidatePath("/panel/admin");
}

function leerCampos(formData: FormData) {
  const titulo = String(formData.get("titulo") || "").trim();
  const fecha_limite = String(formData.get("fecha_limite") || "");
  const hora_limite = String(formData.get("hora_limite") || "");
  return {
    titulo,
    fecha_limite,
    hora_limite,
    descripcion: String(formData.get("descripcion") || "").trim() || null,
    prioridad: String(formData.get("prioridad") || "media"),
    categoria: String(formData.get("categoria") || "") || null,
    // El formulario manda un solo campo; acá se separa en las dos columnas.
    ...leerResponsable(String(formData.get("responsable") || "")),
    paciente_id: String(formData.get("paciente_id") || "") || null,
    avisar_email: formData.get("avisar_email") === "on",
    email_aviso: String(formData.get("email_aviso") || "").trim() || null,
    avisar_whatsapp: formData.get("avisar_whatsapp") === "on",
    telefono_aviso: String(formData.get("telefono_aviso") || "").trim() || null,
  };
}

// Los tres campos obligatorios son los que llevan asterisco en el formulario.
function faltanObligatorios(c: ReturnType<typeof leerCampos>) {
  const faltan: string[] = [];
  if (!c.titulo) faltan.push("el nombre de la tarea");
  if (!c.fecha_limite) faltan.push("la fecha límite");
  if (!c.hora_limite) faltan.push("la hora");
  return faltan;
}

export async function crearTarea(
  _previo: EstadoTareaForm,
  formData: FormData
): Promise<EstadoTareaForm> {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const c = leerCampos(formData);
  const faltan = faltanObligatorios(c);
  if (faltan.length) {
    return { ok: false, mensaje: `Faltan datos obligatorios: ${faltan.join(", ")}.` };
  }
  if (c.avisar_email && !c.email_aviso) {
    return { ok: false, mensaje: "Marcaste aviso por correo pero no cargaste la dirección." };
  }
  if (c.avisar_whatsapp && !c.telefono_aviso) {
    return { ok: false, mensaje: "Marcaste aviso por WhatsApp pero no cargaste el teléfono." };
  }

  const sinResponsable = !c.responsable_usuario_id && !c.responsable_paciente_id;
  const { error } = await supabase.from("tareas").insert({
    ...c,
    // Sin responsable elegido, queda a nombre de quien la crea.
    responsable_usuario_id: sinResponsable ? usuario.id : c.responsable_usuario_id,
    creada_por: usuario.id,
  });
  if (error) return { ok: false, mensaje: `No se pudo crear la tarea: ${error.message}` };

  await registrarAuditoria("alta_tarea", c.titulo);
  refrescar();
  return { ok: true, mensaje: `Se creó la tarea "${c.titulo}".` };
}

export async function actualizarTarea(
  _previo: EstadoTareaForm,
  formData: FormData
): Promise<EstadoTareaForm> {
  await requireRole("to", "admin");
  const supabase = await createClient();

  const id = String(formData.get("tarea_id") || "");
  const c = leerCampos(formData);
  const faltan = faltanObligatorios(c);
  if (faltan.length) {
    return { ok: false, mensaje: `Faltan datos obligatorios: ${faltan.join(", ")}.` };
  }

  const { error } = await supabase.from("tareas").update(c).eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  await registrarAuditoria("edicion_tarea", `${c.titulo} (${id})`);
  refrescar();
  return { ok: true, mensaje: "Cambios guardados." };
}

// Cambiar de estado es la acción más frecuente, así que va por su propio
// formulario en la lista, sin abrir la ventana de edición.
export async function cambiarEstadoTarea(formData: FormData) {
  await requireRole("to", "admin");
  const supabase = await createClient();

  const id = String(formData.get("tarea_id") || "");
  const estado = String(formData.get("estado") || "pendiente");

  await supabase
    .from("tareas")
    .update({
      estado,
      completada_at: estado === "completada" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  await registrarAuditoria("estado_tarea", `${id} → ${estado}`);
  refrescar();
}

export async function eliminarTarea(formData: FormData) {
  await requireRole("to", "admin");
  const supabase = await createClient();

  const id = String(formData.get("tarea_id") || "");
  // Una tarea no es historia clínica: acá sí se borra de verdad.
  await supabase.from("tareas").delete().eq("id", id);

  await registrarAuditoria("baja_tarea", id);
  refrescar();
}
