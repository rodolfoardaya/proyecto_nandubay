import { NextRequest, NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/auditoria";

// Las contraseñas ya cargadas nunca se pueden mostrar: Supabase Auth solo
// guarda un hash, ni siquiera el service role puede leerlas. Lo único
// posible es resetear a una clave nueva y mostrarla una única vez acá.
function generarClave(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || usuario.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { usuario_id } = await request.json();
  if (!usuario_id) {
    return NextResponse.json({ error: "Falta usuario_id" }, { status: 400 });
  }

  const clave = generarClave();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(usuario_id, { password: clave });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await registrarAuditoria("reset_clave", `Clave reseteada para usuario ${usuario_id}`);

  return NextResponse.json({ clave });
}
