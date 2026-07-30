import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUsuarioActual } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || (usuario.rol !== "to" && usuario.rol !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR no configurado" }, { status: 501 });
  }

  const formData = await request.formData();
  const archivo = formData.get("archivo") as File | null;
  if (!archivo) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const bytes = Buffer.from(await archivo.arrayBuffer()).toString("base64");
  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: bytes },
          },
          {
            type: "text",
            text:
              "Es una factura/comprobante argentino. Extraé: fecha de facturación (fecha_facturacion), monto total (monto, solo número), y fecha estimada de vencimiento de cobro (fecha_vencimiento_estimada). Si no hay vencimiento explícito, calculalo sumando 45 días corridos a la fecha de facturación (típico de obra social en Tucumán). Respondé ÚNICAMENTE con JSON: {\"fecha_facturacion\":\"YYYY-MM-DD\",\"monto\":0,\"fecha_vencimiento_estimada\":\"YYYY-MM-DD\"}. Si algún dato no se puede determinar, usá null.",
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
    return NextResponse.json({ error: "No se pudo interpretar la factura" }, { status: 422 });
  }
}
