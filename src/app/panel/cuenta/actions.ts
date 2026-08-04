"use server";

import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type EstadoClave = { ok: boolean; mensaje: string } | null;

const LARGO_MINIMO = 8;

// Cambio de contraseña por parte del propio usuario. Se pide la clave actual
// aunque la sesión ya esté abierta: si alguien deja el panel abierto, no
// alcanza con eso para quedarse con la cuenta.
export async function cambiarMiClave(
  _previo: EstadoClave,
  formData: FormData
): Promise<EstadoClave> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, mensaje: "Tu sesión venció. Volvé a ingresar." };

  const actual = String(formData.get("actual") || "");
  const nueva = String(formData.get("nueva") || "");
  const repetida = String(formData.get("repetida") || "");

  if (nueva.length < LARGO_MINIMO) {
    return { ok: false, mensaje: `La clave nueva tiene que tener al menos ${LARGO_MINIMO} caracteres.` };
  }
  if (nueva !== repetida) {
    return { ok: false, mensaje: "Las dos claves nuevas no coinciden." };
  }
  if (nueva === actual) {
    return { ok: false, mensaje: "La clave nueva tiene que ser distinta de la actual." };
  }

  const supabase = await createClient();

  // Se comprueba la clave actual reintentando el ingreso con ella.
  const { error: errorActual } = await supabase.auth.signInWithPassword({
    email: usuario.email,
    password: actual,
  });
  if (errorActual) {
    return { ok: false, mensaje: "La clave actual no es correcta." };
  }

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    return { ok: false, mensaje: `No se pudo cambiar la clave: ${error.message}` };
  }

  await registrarAuditoria("cambio_clave_propia");

  return { ok: true, mensaje: "Listo, tu clave quedó cambiada." };
}
