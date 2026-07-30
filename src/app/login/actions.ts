"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/auditoria";

// El ingreso es por nombre de usuario, no por email. Supabase Auth solo
// entiende email, así que primero resolvemos el email real asociado a ese
// usuario (con el email como alternativa, para cuentas viejas que todavía
// no tengan un `usuario` propio asignado).
async function resolverEmail(usuarioIngresado: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: porUsuario } = await admin
    .from("usuarios")
    .select("email")
    .eq("usuario", usuarioIngresado)
    .maybeSingle();
  if (porUsuario) return porUsuario.email;

  const { data: porEmail } = await admin
    .from("usuarios")
    .select("email")
    .eq("email", usuarioIngresado)
    .maybeSingle();
  return porEmail?.email ?? null;
}

export async function signIn(formData: FormData) {
  const usuarioIngresado = String(formData.get("usuario"));
  const password = String(formData.get("password"));

  const email = await resolverEmail(usuarioIngresado);
  if (!email) {
    redirect("/login?error=1");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect("/login?error=1");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", data.user.id)
    .single();

  await registrarAuditoria("login");

  redirect(`/panel/${usuario?.rol ?? "familiar"}`);
}

export async function signOut() {
  const supabase = await createClient();
  await registrarAuditoria("logout");
  await supabase.auth.signOut();
  redirect("/login");
}
