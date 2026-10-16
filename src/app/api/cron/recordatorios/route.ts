import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarRecordatorioWhatsApp } from "@/lib/whatsapp";
import { enviarMail } from "@/lib/mail";

// Busca turnos que caen dentro de las próximas 24-25hs, confirmados, sin
// recordatorio enviado todavía, y les manda un WhatsApp al familiar del
// paciente. Protegido con CRON_SECRET.
//
// La ventana es de una hora, así que esto tiene que correr una vez por hora
// o los turnos de las horas salteadas se quedan sin aviso. No hay scheduler
// dentro de la app: se da de alta en el panel de Hostinger, en Cron Jobs,
// con schedule "0 * * * *" y el comando:
//
//   curl -s "https://DOMINIO/api/cron/recordatorios?secret=EL_CRON_SECRET"
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const ahora = new Date();
  const desde = new Date(ahora.getTime() + 24 * 3600000);
  const hasta = new Date(ahora.getTime() + 25 * 3600000);

  const { data: turnos } = await admin
    .from("turnos")
    .select("id, fecha, hora, estado, pacientes(nombre, familiar_id)")
    .eq("estado", "confirmado")
    .gte("fecha", desde.toISOString().slice(0, 10))
    .lte("fecha", hasta.toISOString().slice(0, 10));

  let enviados = 0;
  let omitidos = 0;

  for (const t of turnos ?? []) {
    const turnoInicio = new Date(`${t.fecha}T${t.hora}`);
    if (turnoInicio < desde || turnoInicio > hasta) continue;

    const { data: yaEnviado } = await admin
      .from("recordatorios_whatsapp")
      .select("id")
      .eq("turno_id", t.id)
      .eq("estado_envio", "enviado")
      .maybeSingle();
    if (yaEnviado) {
      omitidos++;
      continue;
    }

    // @ts-expect-error relación anidada
    const familiarId = t.pacientes?.familiar_id;
    if (!familiarId) {
      omitidos++;
      continue;
    }

    const { data: familiar } = await admin
      .from("usuarios")
      .select("telefono")
      .eq("id", familiarId)
      .single();

    if (!familiar?.telefono) {
      omitidos++;
      continue;
    }

    const resultado = await enviarRecordatorioWhatsApp({
      telefono: familiar.telefono,
      // @ts-expect-error relación anidada
      pacienteNombre: t.pacientes?.nombre ?? "",
      fecha: t.fecha,
      hora: t.hora,
    });

    await admin.from("recordatorios_whatsapp").insert({
      turno_id: t.id,
      fecha_envio: new Date().toISOString(),
      estado_envio: resultado.ok ? "enviado" : "error",
    });

    if (resultado.ok) enviados++;
    else omitidos++;
  }

  // ── Avisos de tareas ────────────────────────────────────────────────────
  // Las tareas con aviso marcado se notifican una sola vez, 24 horas antes de
  // vencer. `aviso_enviado_at` impide que se repita si el cron vuelve a
  // correr dentro de la misma ventana.
  const { data: tareas } = await admin
    .from("tareas")
    .select(
      "id, titulo, descripcion, fecha_limite, hora_limite, avisar_email, email_aviso, avisar_whatsapp, telefono_aviso"
    )
    .is("aviso_enviado_at", null)
    .neq("estado", "completada")
    .or("avisar_email.eq.true,avisar_whatsapp.eq.true")
    .gte("fecha_limite", desde.toISOString().slice(0, 10))
    .lte("fecha_limite", hasta.toISOString().slice(0, 10));

  let tareasAvisadas = 0;

  for (const tarea of tareas ?? []) {
    const vence = new Date(`${tarea.fecha_limite}T${tarea.hora_limite}`);
    if (vence < desde || vence > hasta) continue;

    let seAviso = false;
    const cuando = `${tarea.fecha_limite} a las ${tarea.hora_limite.slice(0, 5)}`;

    if (tarea.avisar_email && tarea.email_aviso) {
      const r = await enviarMail({
        to: tarea.email_aviso,
        subject: `Recordatorio: ${tarea.titulo}`,
        html:
          `<p>La tarea <strong>${tarea.titulo}</strong> vence el ${cuando}.</p>` +
          (tarea.descripcion ? `<p>${tarea.descripcion}</p>` : "") +
          `<p style="color:#666">Espacio Ñandubay</p>`,
      });
      if (r.ok) seAviso = true;
    }

    // El aviso por WhatsApp necesita las credenciales de Meta cargadas en el
    // servidor. Sin ellas el envío falla y la tarea queda sin marcar, para
    // que el aviso salga cuando se configuren.
    if (tarea.avisar_whatsapp && tarea.telefono_aviso) {
      const r = await enviarRecordatorioWhatsApp({
        telefono: tarea.telefono_aviso,
        pacienteNombre: tarea.titulo,
        fecha: tarea.fecha_limite,
        hora: tarea.hora_limite.slice(0, 5),
      });
      if (r.ok) seAviso = true;
    }

    if (seAviso) {
      await admin
        .from("tareas")
        .update({ aviso_enviado_at: new Date().toISOString() })
        .eq("id", tarea.id);
      tareasAvisadas++;
    }
  }

  return NextResponse.json({ enviados, omitidos, tareasAvisadas });
}
