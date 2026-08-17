"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

// Sin caracteres que se confundan al dictarla o anotarla (O/0, I/1, l).
function generarClaveProvisoria(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function crearTo(formData: FormData) {
  await requireRole("admin");

  const nombre = String(formData.get("nombre"));
  const dni = String(formData.get("dni") || "");
  const usuario = String(formData.get("usuario"));
  const email = String(formData.get("email"));
  const matricula = String(formData.get("matricula") || "");
  const frase = String(formData.get("frase") || "");

  const admin = createAdminClient();

  // La cuenta se crea con una clave provisoria y el email ya confirmado, y
  // esa clave se le entrega en mano a la profesional.
  //
  // Antes esto mandaba una invitación por email de Supabase. En el plan
  // gratuito esos mails no llegan, así que la cuenta quedaba creada pero
  // imposible de usar: la TO no podía entrar y no había forma de saber por
  // qué (el login sólo decía "Email not confirmed").
  const clave = generarClaveProvisoria();

  const { data: creado, error: errorCrear } = await admin.auth.admin.createUser({
    email,
    password: clave,
    email_confirm: true,
  });

  if (errorCrear || !creado.user) {
    throw new Error(errorCrear?.message ?? "No se pudo crear la cuenta de la TO");
  }

  const supabase = await createClient();

  await admin.from("usuarios").insert({
    id: creado.user.id,
    email,
    usuario,
    nombre,
    rol: "to",
  });

  await supabase.from("tos").insert({
    usuario_id: creado.user.id,
    nombre,
    dni,
    matricula,
    frase_perfil: frase,
  });

  revalidatePath("/panel/admin/equipo");

  // La clave viaja en la URL una sola vez para poder mostrarla; Supabase
  // guarda sólo el hash, así que después ya no hay forma de recuperarla.
  redirect(`/panel/admin/equipo?nueva_to=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`);
}

export async function actualizarTo(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const to_id = String(formData.get("to_id"));
  const nombre = String(formData.get("nombre"));
  const dni = String(formData.get("dni") || "");
  const matricula = String(formData.get("matricula") || "");
  const frase = String(formData.get("frase") || "");

  const { error } = await supabase
    .from("tos")
    .update({ nombre, dni, matricula, frase_perfil: frase })
    .eq("id", to_id);

  if (error) throw new Error(error.message);

  revalidatePath("/panel/admin/equipo");
}

export async function cambiarEstadoTo(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const to_id = String(formData.get("to_id"));
  const activo = formData.get("activo") === "true";

  const { error } = await supabase.from("tos").update({ activo }).eq("id", to_id);
  if (error) throw new Error(error.message);

  revalidatePath("/panel/admin/equipo");
}

// Borrado real de una TO, para sacar del sistema una cargada por error o de
// prueba. Distinto de la baja: la baja la deja archivada y se puede revertir.
//
// Solo se permite si no quedó nada colgando de ella. Una TO con pacientes,
// turnos, evolución o facturas no se borra: esa información es historia
// clínica y tiene que conservarse (Ley 26.529). La base ya lo impide por
// clave foránea; acá se comprueba antes para poder decir qué es lo que lo
// impide, en vez de mostrar el error crudo de Postgres.
export async function borrarTo(formData: FormData) {
  await requireRole("admin");

  const to_id = String(formData.get("to_id"));
  const admin = createAdminClient();

  const { data: to } = await admin
    .from("tos")
    .select("id, nombre, usuario_id")
    .eq("id", to_id)
    .maybeSingle();

  if (!to) throw new Error("Esa TO ya no existe.");

  // El conteo va con el cliente de servicio a propósito: si RLS escondiera
  // una fila, el control diría que no hay nada y el borrado se llevaría
  // puesta información que sí existe.
  const tablas = [
    { tabla: "pacientes", columna: "to_asignada_id", etiqueta: "pacientes" },
    { tabla: "turnos", columna: "to_id", etiqueta: "turnos" },
    { tabla: "notas_evolucion", columna: "to_id", etiqueta: "notas de evolución" },
    { tabla: "facturas", columna: "to_id", etiqueta: "facturas" },
  ];

  const atados: string[] = [];
  for (const { tabla, columna, etiqueta } of tablas) {
    const { count } = await admin
      .from(tabla)
      .select("id", { count: "exact", head: true })
      .eq(columna, to_id);
    if (count) atados.push(`${count} ${etiqueta}`);
  }

  if (atados.length > 0) {
    throw new Error(
      `No se puede borrar a ${to.nombre}: tiene ${atados.join(", ")} a su nombre. ` +
        "Esa información es historia clínica y no se elimina. Usá \"Dar de baja\", " +
        "que la saca de las listas sin perder nada."
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tos").delete().eq("id", to_id);
  if (error) throw new Error(error.message);

  // La cuenta de acceso se borra después de la fila: al borrar el usuario de
  // auth, la fila de `usuarios` cae por cascada, y con ella habría caído
  // también la de `tos` sin dejar registro de por qué.
  if (to.usuario_id) {
    await admin.auth.admin.deleteUser(to.usuario_id);
  }

  await registrarAuditoria("baja_to", `${to.nombre} — borrada del sistema`);

  revalidatePath("/panel/admin/equipo");
}

export async function subirFotoTo(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const to_id = String(formData.get("to_id"));
  const archivo = formData.get("foto") as File | null;

  if (!archivo) {
    throw new Error("No se seleccionó archivo");
  }

  // Subir a Storage
  const path = `tos/${to_id}/${Date.now()}-${archivo.name}`;
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, archivo, { upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // Actualizar columna foto_url
  const { error: updateError } = await supabase
    .from("tos")
    .update({ foto_url: path })
    .eq("id", to_id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/panel/admin/equipo");
}
