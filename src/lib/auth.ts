import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "admin" | "to" | "direccion";

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

export async function getUsuarioActual(): Promise<Usuario | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, email, nombre, rol")
    .eq("id", user.id)
    .single();

  return usuario as Usuario | null;
}

// Exige sesión activa y, si se pasan roles, que el usuario tenga uno de
// ellos. admin siempre pasa (tiene acceso a las vistas de TO también).
export async function requireRole(...roles: Rol[]): Promise<Usuario> {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (roles.length && !roles.includes(usuario.rol) && usuario.rol !== "admin") {
    redirect(`/panel/${usuario.rol}`);
  }
  return usuario;
}
