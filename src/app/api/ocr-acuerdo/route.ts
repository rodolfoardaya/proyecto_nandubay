import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUsuarioActual } from "@/lib/auth";
import { archivoAContenido } from "@/lib/ocr";

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || (usuario.rol !== "to" && usuario.rol !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Lectura automática no configurada" }, { status: 501 });
  }

  const formData = await request.formData();
  const archivo = formData.get("archivo") as File | null;
  const tipo = formData.get("tipo") === "adulto" ? "adulto" : "nino";
  if (!archivo) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const contenido = await archivoAContenido(archivo);
  if (!contenido) {
    return NextResponse.json(
      { error: "Formato no soportado — subí un PDF o una foto (JPG/PNG/WEBP)" },
      { status: 415 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          contenido,
          {
            type: "text",
            text:
              `Es una planilla de acuerdo terapéutico (manuscrita o su foto) de un consultorio de Terapia Ocupacional (${tipo === "adulto" ? "paciente adulto" : "paciente niño/a"}). Extraé los datos y devolvé ÚNICAMENTE este JSON (sin texto adicional):\n` +
              `{\n` +
              `  "valor_sesion": 0,\n` +
              `  "forma_pago": "efectivo, transferencia, etc.",\n` +
              `  "duracion_sesion_minutos": 45,\n` +
              `  "modalidad": "presencial o online",\n` +
              `  "autoriza_imagenes": true o false\n` +
              `}\n` +
              `Si un campo no está o no se puede leer, usá 0 en valor_sesion, "" en forma_pago, 45 en duracion_sesion_minutos, "presencial" en modalidad, o false en autoriza_imagenes. No inventes datos.`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const datos = JSON.parse(match ? match[0] : raw);
    return NextResponse.json(datos);
  } catch {
    return NextResponse.json({ error: "No se pudo interpretar el acuerdo" }, { status: 422 });
  }
}
