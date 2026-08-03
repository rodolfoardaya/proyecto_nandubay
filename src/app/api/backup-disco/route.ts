import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/auditoria";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Todas las tablas del sistema. El backup tiene que servir para reconstruir,
// así que va todo: lo clínico, lo administrativo y el rastro de auditoría.
const TABLAS = [
  "usuarios",
  "tos",
  "pacientes",
  "fichas_inicio",
  "acuerdos_terapeuticos",
  "notas_evolucion",
  "turnos",
  "facturas",
  "galeria_publica",
  "biblioteca_interna",
  "contacto_formulario",
  "recordatorios_whatsapp",
  "auditoria",
] as const;

const BUCKETS = ["documentos", "facturas"] as const;

// Storage no tiene listado recursivo: hay que bajar carpeta por carpeta. Las
// carpetas se reconocen porque vienen con id nulo.
async function listarRecursivo(
  admin: SupabaseClient,
  bucket: string,
  prefijo = ""
): Promise<string[]> {
  const rutas: string[] = [];
  const { data, error } = await admin.storage
    .from(bucket)
    .list(prefijo, { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (error || !data) return rutas;

  for (const item of data) {
    const ruta = prefijo ? `${prefijo}/${item.name}` : item.name;
    if (item.id === null) {
      rutas.push(...(await listarRecursivo(admin, bucket, ruta)));
    } else {
      rutas.push(ruta);
    }
  }
  return rutas;
}

export async function GET() {
  const usuario = await getUsuarioActual();
  if (!usuario || usuario.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Con service role para que el backup salga completo: el admin no llega por
  // RLS a todo lo que hace falta para poder reconstruir el sistema.
  const admin = createAdminClient();

  const tablas: Record<string, unknown[]> = {};
  const errores: Record<string, string> = {};

  for (const tabla of TABLAS) {
    const { data, error } = await admin.from(tabla).select("*");
    if (error) errores[tabla] = error.message;
    tablas[tabla] = data ?? [];
  }

  const archivos: { bucket: string; ruta: string; url: string }[] = [];

  for (const bucket of BUCKETS) {
    const rutas = await listarRecursivo(admin, bucket);
    if (!rutas.length) continue;

    // Las URLs firmadas duran una hora: suficiente para que el navegador
    // baje todo, y no dejan nada accesible de forma permanente.
    const { data: firmadas } = await admin.storage.from(bucket).createSignedUrls(rutas, 3600);

    for (const f of firmadas ?? []) {
      if (f.signedUrl && f.path) {
        archivos.push({ bucket, ruta: f.path, url: f.signedUrl });
      }
    }
  }

  await registrarAuditoria(
    "backup_disco",
    `Backup completo — ${Object.values(tablas).reduce((n, t) => n + t.length, 0)} registros, ${archivos.length} archivos`
  );

  return NextResponse.json(
    {
      generado_el: new Date().toISOString(),
      generado_por: usuario.nombre,
      tablas,
      archivos,
      errores: Object.keys(errores).length ? errores : null,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
