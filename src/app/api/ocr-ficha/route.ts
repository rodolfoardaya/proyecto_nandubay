import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUsuarioActual } from "@/lib/auth";
import { SECCIONES_NINOS, SECCIONES_ADULTOS } from "@/lib/ficha-fields";
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

  const secciones = tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  // Para los ítems que en la planilla se marcan con una cruz, se le pasan
  // las opciones exactas: así devuelve la etiqueta tal cual y no una
  // paráfrasis que después no coincide con ninguna casilla.
  const camposFicha = secciones.flatMap((s) => s.campos).map((c) => {
    if (!c.opciones) return `"${c.key}": "${c.label}"`;
    const opciones = c.opciones.join(" | ");
    const cuantas = c.tipo === "multi" ? "las marcadas separadas por coma" : "una sola";
    return `"${c.key}": "${c.label} — devolvé ${cuantas} de: ${opciones}"`;
  });

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          contenido,
          {
            type: "text",
            text:
              `Es una ficha de inicio y/o acuerdo terapéutico manuscrito (o foto de una hoja manuscrita) de un consultorio de Terapia Ocupacional (${tipo === "adulto" ? "paciente adulto" : "paciente niño/a"}). Extraé el texto manuscrito de cada campo y devolvé ÚNICAMENTE un JSON con esta forma (sin texto adicional):\n` +
              `{\n` +
              `  "nombre": "nombre y apellido del paciente",\n` +
              `  "dni": "DNI sin puntos",\n` +
              `  "fecha_nacimiento": "YYYY-MM-DD o null si no figura",\n` +
              camposFicha.map((c) => `  ${c}: "..."`).join(",\n") + ",\n" +
              `  "valor_sesion": 0,\n` +
              `  "forma_pago": "efectivo, transferencia, etc.",\n` +
              `  "duracion_sesion_minutos": 45,\n` +
              `  "modalidad": "presencial o online",\n` +
              `  "autoriza_imagenes": true o false\n` +
              `}\n` +
              `Si un campo no está o no se puede leer, usá cadena vacía "" (o null en fecha_nacimiento, 0 en valor_sesion). No inventes datos.`,
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
    return NextResponse.json({ error: "No se pudo interpretar la ficha" }, { status: 422 });
  }
}
