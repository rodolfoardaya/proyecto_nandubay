import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarRecordatorioWhatsApp } from "@/lib/whatsapp";

// Pensado para ejecutarse una vez por hora vía un scheduler externo
// (Vercel Cron u otro), protegido con CRON_SECRET. Busca turnos que caen
// dentro de las próximas 24-25hs, confirmados, sin recordatorio enviado
// todavía, y les manda un WhatsApp al familiar del paciente.
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

  return NextResponse.json({ enviados, omitidos });
}
