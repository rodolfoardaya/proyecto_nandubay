import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { metaImpresion } from "@/lib/pdf/comunes";
import { FichaInicioDoc } from "@/lib/pdf/FichaInicioDoc";
import type { DatosFicha } from "@/lib/ficha-fields";

// Imprime la ficha de inicio de un paciente respetando el formato de la
// planilla en papel. RLS decide qué pacientes puede ver cada usuario.
export async function GET(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || !["to", "admin", "direccion"].includes(usuario.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pacienteId = request.nextUrl.searchParams.get("paciente_id");
  if (!pacienteId) {
    return NextResponse.json({ error: "Falta paciente_id" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre, numero_registro, tipo, dni, fecha_nacimiento, tos(nombre)")
    .eq("id", pacienteId)
    .maybeSingle();

  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const { data: ficha } = await supabase
    .from("fichas_inicio")
    .select("datos")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const to = paciente.tos as unknown as { nombre: string } | { nombre: string }[] | null;
  const toNombre = Array.isArray(to) ? to[0]?.nombre : to?.nombre;

  await registrarAuditoria(
    "impresion",
    `Ficha de inicio — paciente Nº ${paciente.numero_registro}`
  );

  const buffer = await renderToBuffer(
    <FichaInicioDoc
      paciente={{
        nombre: paciente.nombre,
        numero_registro: paciente.numero_registro,
        tipo: paciente.tipo,
        dni: paciente.dni,
        fecha_nacimiento: paciente.fecha_nacimiento,
        to_nombre: toNombre ?? null,
      }}
      datos={(ficha?.datos ?? {}) as DatosFicha}
      meta={metaImpresion(usuario.nombre)}
    />
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-inicio-${paciente.numero_registro}.pdf"`,
    },
  });
}
