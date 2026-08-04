import { NextRequest, NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/auth";
import { generarPlanillaCsv, leerPlanillaCsv } from "@/lib/planilla-csv";

export const dynamic = "force-dynamic";

async function autorizado() {
  const usuario = await getUsuarioActual();
  return usuario && (usuario.rol === "to" || usuario.rol === "admin") ? usuario : null;
}

// GET: entrega la planilla tipo en blanco para completar.
export async function GET(request: NextRequest) {
  if (!(await autorizado())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tipo = request.nextUrl.searchParams.get("tipo") === "adulto" ? "adulto" : "nino";
  const csv = generarPlanillaCsv(tipo);
  const nombre = `planilla-${tipo === "adulto" ? "adultos" : "ninos"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "cache-control": "no-store",
    },
  });
}

// POST: lee la planilla ya completada y devuelve los datos para precargar el
// alta. No interviene ninguna IA: se buscan las claves exactas del archivo.
export async function POST(request: NextRequest) {
  if (!(await autorizado())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const archivo = formData.get("archivo") as File | null;
  const tipo = formData.get("tipo") === "adulto" ? "adulto" : "nino";

  if (!archivo || archivo.size === 0) {
    return NextResponse.json({ error: "No se seleccionó ningún archivo" }, { status: 400 });
  }

  const nombre = archivo.name.toLowerCase();
  if (!nombre.endsWith(".csv") && !nombre.endsWith(".txt")) {
    return NextResponse.json(
      {
        error:
          "El archivo tiene que ser la planilla en CSV. Si la completaste en Excel, guardala como 'CSV UTF-8'.",
      },
      { status: 415 }
    );
  }

  const texto = await archivo.text();
  const leida = leerPlanillaCsv(texto, tipo);

  if (leida.camposLeidos === 0) {
    return NextResponse.json(
      {
        error:
          "No se encontró ningún dato completado. Revisá que hayas llenado la columna VALOR y que sea la planilla de este tipo de paciente.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json(leida);
}
