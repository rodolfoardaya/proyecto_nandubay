"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function crearTo(formData: FormData) {
  await requireRole("admin");

  const nombre = String(formData.get("nombre"));
  const dni = String(formData.get("dni") || "");
  const usuario = String(formData.get("usuario"));
  const email = String(formData.get("email"));
  const matricula = String(formData.get("matricula") || "");
  const frase = String(formData.get("frase") || "");

  const admin = createAdminClient();

  // Crea la cuenta de auth con contraseña temporal e invita por email para
  // que la profesional defina su propia contraseña.
  const { data: invitado, error: errorInvite } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
    });

  if (errorInvite || !invitado.user) {
    throw new Error(errorInvite?.message ?? "No se pudo invitar a la TO");
  }

  const supabase = await createClient();

  await admin.from("usuarios").insert({
    id: invitado.user.id,
    email,
    usuario,
    nombre,
    rol: "to",
  });

  await supabase.from("tos").insert({
    usuario_id: invitado.user.id,
    nombre,
    dni,
    matricula,
    frase_perfil: frase,
  });

  revalidatePath("/panel/admin/equipo");
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
