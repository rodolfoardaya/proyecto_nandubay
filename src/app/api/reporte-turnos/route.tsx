import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { metaImpresion } from "@/lib/pdf/comunes";
import { ReporteTurnosDoc, type TurnoReporte } from "@/lib/pdf/ReporteTurnosDoc";

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || (usuario.rol !== "to" && usuario.rol !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rango = request.nextUrl.searchParams.get("rango") === "semana" ? "semana" : "dia";
  const hoy = new Date().toISOString().slice(0, 10);
  const hasta =
    rango === "semana"
      ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
      : hoy;

  const supabase = await createClient();

  // RLS ya restringe: TO ve sus turnos, Admin ve todos.
  const { data: turnos } = await supabase
    .from("turnos")
    .select("fecha, hora, modalidad, estado, pacientes(nombre), tos(nombre)")
    .gte("fecha", hoy)
    .lte("fecha", hasta)
    .order("fecha")
    .order("hora");

  const datos: TurnoReporte[] = (turnos ?? []).map((t) => ({
    fecha: t.fecha,
    hora: t.hora,
    /* @ts-expect-error relación anidada */
    pacienteNombre: t.pacientes?.nombre ?? "",
    /* @ts-expect-error relación anidada */
    toNombre: t.tos?.nombre ?? "",
    modalidad: t.modalidad,
    estado: t.estado,
  }));

  const titulo = rango === "semana" ? "Reporte de turnos — semana" : "Reporte de turnos — hoy";
  await registrarAuditoria("exportacion", `Reporte de turnos (${rango}) — ${datos.length} turnos`);
  const buffer = await renderToBuffer(
    <ReporteTurnosDoc titulo={titulo} turnos={datos} meta={metaImpresion(usuario.nombre)} />
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-turnos-${rango}-${Date.now()}.pdf"`,
    },
  });
}
