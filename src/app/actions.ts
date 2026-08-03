"use server";

import { createClient } from "@/lib/supabase/server";

// Tope de caracteres por campo. El formulario es público y anónimo: sin un
// límite, cualquiera puede llenar la tabla con textos enormes.
const TOPES = { nombre: 120, email: 160, telefono: 40, motivo: 200, mensaje: 4000 };

// Consultas del formulario público del sitio.
//
// Se guardan siempre en `contacto_formulario` y, además, se avisan por mail.
// El orden importa: primero la base, que es lo que no se puede perder, y
// recién después el mail. Si el mail falla, la consulta ya quedó registrada.

export type EstadoConsulta = { ok: boolean; mensaje: string } | null;

const DESTINO = "espacionandubay@gmail.com";

function escapar(s: string) {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c);
}

async function avisarPorMail(datos: {
  nombre: string;
  email: string;
  telefono: string;
  motivo: string;
  mensaje: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  // Sin API key configurada no se manda nada: la consulta igual quedó
  // guardada, y el aviso empieza a salir apenas se cargue la variable.
  if (!apiKey) return;

  const remitente = process.env.MAIL_REMITENTE || "Ñandubay <onboarding@resend.dev>";

  const cuerpo = `
    <h2>Nueva consulta desde espacionandubay.com</h2>
    <p><b>Nombre:</b> ${escapar(datos.nombre)}</p>
    <p><b>Email:</b> ${escapar(datos.email)}</p>
    <p><b>Teléfono:</b> ${escapar(datos.telefono) || "—"}</p>
    <p><b>Motivo:</b> ${escapar(datos.motivo) || "—"}</p>
    <p><b>Mensaje:</b><br>${escapar(datos.mensaje).replace(/\n/g, "<br>") || "—"}</p>
    <hr>
    <p style="color:#666;font-size:12px">
      Recibida el ${new Date().toLocaleString("es-AR")}.
      También quedó guardada en el sistema.
    </p>
  `;

  // Se llama por HTTPS (443) a propósito: el hosting no deja salir por los
  // puertos de SMTP, así que un envío por servidor de correo no funcionaría.
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remitente,
      to: [DESTINO],
      reply_to: datos.email,
      subject: `Consulta de ${datos.nombre}${datos.motivo ? ` — ${datos.motivo}` : ""}`,
      html: cuerpo,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
  }
}

export async function enviarConsulta(
  _previo: EstadoConsulta,
  formData: FormData
): Promise<EstadoConsulta> {
  const leer = (campo: keyof typeof TOPES) =>
    String(formData.get(campo) || "").trim().slice(0, TOPES[campo]);

  const datos = {
    nombre: leer("nombre"),
    email: leer("email"),
    telefono: leer("telefono"),
    motivo: leer("motivo"),
    mensaje: leer("mensaje"),
  };

  if (!datos.nombre || !datos.email) {
    return { ok: false, mensaje: "Necesitamos al menos tu nombre y tu email." };
  }

  // Cliente anónimo, no el de servicio: la policy `contacto_insert_publico`
  // ya habilita esta inserción, así que no hace falta saltear RLS en una
  // ruta que puede disparar cualquiera desde internet.
  const supabase = await createClient();
  const { error } = await supabase.from("contacto_formulario").insert({
    nombre: datos.nombre,
    email: datos.email,
    telefono: datos.telefono || null,
    motivo: datos.motivo || null,
    mensaje: datos.mensaje || null,
  });

  if (error) {
    console.error("[contacto] no se pudo guardar la consulta:", error.message);
    return {
      ok: false,
      mensaje:
        "No pudimos registrar tu consulta. Escribinos por WhatsApp al 3815821197.",
    };
  }

  try {
    await avisarPorMail(datos);
  } catch (e) {
    // La consulta ya está guardada: que falle el aviso no es motivo para
    // decirle a la persona que no llegó.
    console.error("[contacto] la consulta se guardó pero falló el aviso por mail:", e);
  }

  return { ok: true, mensaje: "¡Gracias por escribirnos! Te vamos a responder a la brevedad." };
}
