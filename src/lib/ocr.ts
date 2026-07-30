import type Anthropic from "@anthropic-ai/sdk";

type ContenidoDocumento = Anthropic.Messages.DocumentBlockParam | Anthropic.Messages.ImageBlockParam;

const TIPOS_IMAGEN = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

// Arma el bloque de contenido para mandarle a Claude un archivo subido por
// el usuario: PDF como "document", foto (JPG/PNG/WEBP/GIF) como "image".
// Devuelve null si el tipo de archivo no está soportado.
export async function archivoAContenido(archivo: File): Promise<ContenidoDocumento | null> {
  const tipo = archivo.type;
  const data = Buffer.from(await archivo.arrayBuffer()).toString("base64");

  if (tipo === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  }

  if (TIPOS_IMAGEN.has(tipo)) {
    const media_type = (tipo === "image/jpg" ? "image/jpeg" : tipo) as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/gif";
    return { type: "image", source: { type: "base64", media_type, data } };
  }

  return null;
}
