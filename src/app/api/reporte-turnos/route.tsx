import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { metaImpresion } from "@/lib/pdf/comunes";
import { ReporteTurnosDoc, type TurnoReporte } from "@/lib/pdf/ReporteTurnosDoc";
import {
  aHHMM,
  formatoCorto,
  hoyIso,
  ocurrenciasEn,
  semanaDe,
  type Turno,
} from "@/lib/agenda";

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || (usuario.rol !== "to" && usuario.rol !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rango = request.nextUrl.searchParams.get("rango") === "semana" ? "semana" : "dia";

  // La semana es la del calendario, de lunes a sábado, igual que la agenda:
  // pedir "la semana" y recibir los próximos siete días corridos hacía que el
  // reporte del lunes terminara el lunes siguiente y no cerrara ninguna semana.
  const hoy = hoyIso();
  const fechas = rango === "semana" ? semanaDe(hoy) : [hoy];
  const desde = fechas[0];
  const hasta = fechas[fechas.length - 1];

  const supabase = await createClient();

  // RLS ya restringe: TO ve sus turnos, Admin ve todos.
  //
  // Las repeticiones de un turno semanal no son filas: la tabla guarda la
  // definición de la serie y las fechas se calculan. Por eso se traen todas
  // las series que empezaron antes del corte —no sólo las que arrancan dentro
  // del rango— y recién después se las expande. Filtrar por `fecha` acá era
  // lo que dejaba afuera a todo paciente semanal cargado en otra semana.
  const { data: turnosRaw } = await supabase
    .from("turnos")
    .select(
      "id, fecha, hora, estado, modalidad, frecuencia, fecha_fin, duracion_minutos, paciente_id, pacientes(nombre), tos(nombre)"
    )
    .lte("fecha", hasta);

  const series: Turno[] = (turnosRaw ?? []).map((t) => ({
    id: t.id,
    fecha: t.fecha,
    hora: t.hora,
    estado: t.estado,
    modalidad: t.modalidad,
    frecuencia: (t.frecuencia ?? "unica") as Turno["frecuencia"],
    fecha_fin: t.fecha_fin,
    duracion_minutos: t.duracion_minutos ?? 45,
    paciente_id: t.paciente_id,
    // @ts-expect-error relación anidada
    paciente: t.pacientes?.nombre ?? "",
  }));

  // El nombre de la TO no viaja en la serie, pero se necesita en el listado.
  const toPorTurno = new Map(
    (turnosRaw ?? []).map((t) => [
      t.id,
      // @ts-expect-error relación anidada
      (t.tos?.nombre as string | undefined) ?? "",
    ])
  );

  // Las fechas canceladas puntualmente no son turnos: se saltean.
  const { data: excepciones } = await supabase
    .from("turnos_excepciones")
    .select("turno_id, fecha")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  const ocurrencias = ocurrenciasEn(series, desde, hasta, excepciones ?? []).sort(
    (a, b) =>
      a.fechaOcurrencia.localeCompare(b.fechaOcurrencia) || a.hora.localeCompare(b.hora)
  );

  const datos: TurnoReporte[] = ocurrencias.map((t) => ({
    fecha: t.fechaOcurrencia,
    hora: aHHMM(t.hora),
    pacienteNombre: t.paciente,
    toNombre: toPorTurno.get(t.id) ?? "",
    modalidad: t.modalidad,
    estado: t.estado,
  }));

  // El título dice el rango cubierto: sin eso no hay forma de saber, mirando
  // el papel, qué días entraron en el reporte.
  const titulo =
    rango === "semana"
      ? `Reporte de turnos — semana del ${formatoCorto(desde)} al ${formatoCorto(hasta)}`
      : `Reporte de turnos — ${formatoCorto(hoy)}`;

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
