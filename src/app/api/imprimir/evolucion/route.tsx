import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { metaImpresion } from "@/lib/pdf/comunes";
import { EvolucionDoc, type NotaEvolucion } from "@/lib/pdf/EvolucionDoc";

// Imprime sólo los datos personales del paciente y su evolución. RLS decide
// qué pacientes puede ver cada usuario.
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

  const { data: evolucion } = await supabase
    .from("notas_evolucion")
    .select("fecha, nota, objetivos_trabajados")
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false });

  const to = paciente.tos as unknown as { nombre: string } | { nombre: string }[] | null;
  const toNombre = Array.isArray(to) ? to[0]?.nombre : to?.nombre;

  await registrarAuditoria(
    "impresion",
    `Evolución — paciente Nº ${paciente.numero_registro}`
  );

  const buffer = await renderToBuffer(
    <EvolucionDoc
      paciente={{
        nombre: paciente.nombre,
        numero_registro: paciente.numero_registro,
        tipo: paciente.tipo,
        dni: paciente.dni,
        fecha_nacimiento: paciente.fecha_nacimiento,
        to_nombre: toNombre ?? null,
      }}
      notas={(evolucion ?? []) as NotaEvolucion[]}
      meta={metaImpresion(usuario.nombre)}
    />
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="evolucion-${paciente.numero_registro}.pdf"`,
    },
  });
}
