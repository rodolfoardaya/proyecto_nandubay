import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { metaImpresion } from "@/lib/pdf/comunes";
import {
  ReporteSeguimientoDoc,
  type BloqueReporte,
  type FilaSeguimiento,
} from "@/lib/pdf/ReporteSeguimientoDoc";
import { aHHMM, hoyIso } from "@/lib/agenda";

export const dynamic = "force-dynamic";

// Cada variable pedida define qué filas entran y de qué columna sale la
// observación que se muestra.
const VARIABLES: Record<
  string,
  { titulo: string; vacio: string; campo: "asistencia" | "pago"; valor: string; obs: string }
> = {
  adeudados: {
    titulo: "Turnos adeudados",
    vacio: "No hay turnos adeudados en el período.",
    campo: "pago",
    valor: "adeudado",
    obs: "observacion_pago",
  },
  ausentes: {
    titulo: "Turnos con ausencia",
    vacio: "No hubo ausencias registradas en el período.",
    campo: "asistencia",
    valor: "ausente",
    obs: "observacion_asistencia",
  },
  pagados: {
    titulo: "Turnos pagados",
    vacio: "No hay turnos cobrados en el período.",
    campo: "pago",
    valor: "pagado",
    obs: "observacion_pago",
  },
  obra_social: {
    titulo: "Turnos por obra social",
    vacio: "No hay turnos por obra social en el período.",
    campo: "pago",
    valor: "obra_social",
    obs: "observacion_pago",
  },
  presentes: {
    titulo: "Turnos con asistencia",
    vacio: "No hay asistencias registradas en el período.",
    campo: "asistencia",
    valor: "presente",
    obs: "observacion_asistencia",
  },
};

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || (usuario.rol !== "to" && usuario.rol !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams;
  const valida = (f: string | null) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : null);

  const hoy = hoyIso();
  const desde = valida(q.get("desde")) ?? `${hoy.slice(0, 7)}-01`;
  const hasta = valida(q.get("hasta")) ?? hoy;

  const pedidas = (q.get("incluir") ?? "adeudados,ausentes")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v in VARIABLES);

  if (!pedidas.length) {
    return NextResponse.json({ error: "No se pidió ninguna variable" }, { status: 400 });
  }

  const supabase = await createClient();

  // El seguimiento es la fuente: sólo interesan las fechas ya marcadas. RLS
  // limita a los turnos que le corresponden a quien consulta.
  const { data } = await supabase
    .from("turnos_seguimiento")
    .select(
      "fecha, asistencia, pago, observacion_asistencia, observacion_pago, turnos(hora, pacientes(nombre), tos(nombre))"
    )
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha");

  const filas = (data ?? []) as unknown as Record<string, unknown>[];

  const aFila = (s: Record<string, unknown>, campoObs: string): FilaSeguimiento => {
    const t = s.turnos as
      | { hora?: string; pacientes?: { nombre?: string }; tos?: { nombre?: string } }
      | null;
    return {
      fecha: String(s.fecha),
      hora: t?.hora ? aHHMM(t.hora) : "—",
      paciente: t?.pacientes?.nombre ?? "—",
      to: t?.tos?.nombre ?? "—",
      observacion: (s[campoObs] as string) ?? null,
    };
  };

  const bloques: BloqueReporte[] = pedidas.map((clave) => {
    const v = VARIABLES[clave];
    return {
      titulo: v.titulo,
      vacio: v.vacio,
      filas: filas.filter((s) => s[v.campo] === v.valor).map((s) => aFila(s, v.obs)),
    };
  });

  await registrarAuditoria(
    "reporte_seguimiento",
    `${desde} a ${hasta} — ${bloques.map((b) => `${b.titulo}: ${b.filas.length}`).join(", ")}`
  );

  const buffer = await renderToBuffer(
    <ReporteSeguimientoDoc
      bloques={bloques}
      desde={desde}
      hasta={hasta}
      meta={metaImpresion(usuario.nombre)}
    />
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="seguimiento-${desde}-a-${hasta}.pdf"`,
    },
  });
}
