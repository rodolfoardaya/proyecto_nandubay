// Envía recordatorios de turno por WhatsApp usando la Meta Cloud API.
// Requiere WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID (Meta for
// Developers), más una plantilla de mensaje aprobada por Meta (los mensajes
// que inicia el negocio, fuera de una conversación de 24hs, deben usar una
// plantilla — no se puede mandar texto libre).

const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "recordatorio_turno";

export async function enviarRecordatorioWhatsApp(params: {
  telefono: string; // formato internacional, ej. 5493815821197
  pacienteNombre: string;
  fecha: string;
  hora: string;
}): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp no configurado" };
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.telefono,
        type: "template",
        template: {
          name: TEMPLATE_NAME,
          language: { code: "es_AR" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: params.pacienteNombre },
                { type: "text", text: params.fecha },
                { type: "text", text: params.hora },
              ],
            },
          ],
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body };
  }

  return { ok: true };
}
