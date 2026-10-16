// Envío de correo por HTTPS a través de Resend.
//
// Se llama por el puerto 443 a propósito: el hosting no deja salir por los
// puertos de SMTP, así que un envío por servidor de correo no funcionaría.
//
// Devuelve el resultado en vez de lanzar: ningún aviso que falle puede tirar
// abajo la tarea que lo disparó.
export async function enviarMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; motivo?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, motivo: "Falta RESEND_API_KEY en el servidor." };

  const remitente = process.env.MAIL_REMITENTE || "Ñandubay <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: remitente, to: [to], subject, html }),
    });

    if (!res.ok) return { ok: false, motivo: `Resend respondió ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}
