import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { metaImpresion } from "@/lib/pdf/comunes";
import { HistoriaClinicaDoc, type PacienteBackup } from "@/lib/pdf/HistoriaClinicaDoc";

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || (usuario.rol !== "to" && usuario.rol !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pacienteId = request.nextUrl.searchParams.get("paciente_id");
  const pacienteIds = request.nextUrl.searchParams.get("paciente_ids");
  const supabase = await createClient();

  // RLS ya restringe: una TO solo ve sus propios pacientes, Admin ve todos.
  let query = supabase
    .from("pacientes")
    .select("id, nombre, numero_registro, tipo, fecha_nacimiento, dni")
    .order("nombre");

  if (pacienteId) {
    query = query.eq("id", pacienteId);
  } else if (pacienteIds) {
    query = query.in("id", pacienteIds.split(",").filter(Boolean));
  }

  const { data: pacientes } = await query;

  if (!pacientes?.length) {
    return NextResponse.json({ error: "Sin pacientes para exportar" }, { status: 404 });
  }

  const datos: PacienteBackup[] = [];
  for (const p of pacientes) {
    const [{ data: ficha }, { data: acuerdo }, { data: evolucion }] = await Promise.all([
      supabase
        .from("fichas_inicio")
        .select("datos")
        .eq("paciente_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("acuerdos_terapeuticos")
        .select("valor_sesion, forma_pago, duracion_sesion_minutos, modalidad, autoriza_imagenes, observaciones")
        .eq("paciente_id", p.id)
        .order("fecha", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("notas_evolucion")
        .select("fecha, nota, objetivos_trabajados")
        .eq("paciente_id", p.id)
        .order("fecha", { ascending: false }),
    ]);

    datos.push({
      nombre: p.nombre,
      numero_registro: p.numero_registro,
      tipo: p.tipo,
      fecha_nacimiento: p.fecha_nacimiento,
      dni: p.dni,
      ficha: ficha as PacienteBackup["ficha"],
      acuerdo: acuerdo as PacienteBackup["acuerdo"],
      evolucion: evolucion ?? [],
    });
  }

  await registrarAuditoria("exportacion", `Backup de historia clínica — ${datos.length} pacientes`);

  const buffer = await renderToBuffer(
    <HistoriaClinicaDoc pacientes={datos} meta={metaImpresion(usuario.nombre)} />
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="backup-nandubay-${Date.now()}.pdf"`,
    },
  });
}
