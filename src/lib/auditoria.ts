import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Registra acciones que no dejan rastro por sí solas en las tablas (login,
// logout, impresión, exportación). Las altas/modificaciones/bajas de
// pacientes, fichas, acuerdos, evolución y turnos ya quedan auditadas
// automáticamente por los triggers de la migración 0006_auditoria.sql.
export async function registrarAuditoria(accion: string, detalle?: string) {
  const usuario = await getUsuarioActual();
  if (!usuario) return;

  const supabase = await createClient();
  await supabase.from("auditoria").insert({
    usuario_id: usuario.id,
    usuario_nombre: usuario.nombre,
    usuario_rol: usuario.rol,
    accion,
    detalle,
  });
}
