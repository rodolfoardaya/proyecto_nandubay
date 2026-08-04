"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
