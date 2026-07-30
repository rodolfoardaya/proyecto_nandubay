import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { metaImpresion } from "@/lib/pdf/comunes";
import { AcuerdoDoc } from "@/lib/pdf/AcuerdoDoc";
import type { DatosFicha } from "@/lib/ficha-fields";

// Imprime el acuerdo terapéutico completo (el texto del contrato en papel,
// con los valores acordados y las firmas). Si no hay acuerdo cargado emite
// el documento en blanco, listo para firmar en la primera entrevista.
export async function GET(request: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario || !["to", "admin", "direccion"].includes(usuario.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pacienteId = request.nextUrl.searchParams.get("paciente_id");
  if (!pacienteId) {
    return NextResponse.json({ error: "Falta paciente_id" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre, numero_registro, tipo, dni, tos(nombre)")
    .eq("id", pacienteId)
    .maybeSingle();

  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const [{ data: acuerdo }, { data: ficha }] = await Promise.all([
    supabase
      .from("acuerdos_terapeuticos")
      .select(
        "valor_sesion, forma_pago, duracion_sesion_minutos, modalidad, autoriza_imagenes, observaciones, fecha, firma_url"
      )
      .eq("paciente_id", pacienteId)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fichas_inicio")
      .select("datos")
      .eq("paciente_id", pacienteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // La firma manuscrita se guarda en un bucket privado: hay que bajarla
  // para poder incrustarla en el PDF.
  let firmaResponsable: Buffer | null = null;
  if (acuerdo?.firma_url) {
    const { data: archivo } = await supabase.storage.from("documentos").download(acuerdo.firma_url);
    if (archivo) firmaResponsable = Buffer.from(await archivo.arrayBuffer());
  }

  const datos = (ficha?.datos ?? {}) as DatosFicha;
  const to = paciente.tos as unknown as { nombre: string } | { nombre: string }[] | null;
  const toNombre = Array.isArray(to) ? to[0]?.nombre : to?.nombre;

  await registrarAuditoria(
    "impresion",
    `Acuerdo terapéutico — paciente Nº ${paciente.numero_registro}`
  );

  const buffer = await renderToBuffer(
    <AcuerdoDoc
      paciente={{
        nombre: paciente.nombre,
        numero_registro: paciente.numero_registro,
        tipo: paciente.tipo,
        dni: paciente.dni,
        responsable: datos.tutor_nombre?.valor ?? null,
        to_nombre: toNombre ?? null,
      }}
      acuerdo={{
        valor_sesion: acuerdo?.valor_sesion ?? null,
        forma_pago: acuerdo?.forma_pago ?? null,
        duracion_sesion_minutos: acuerdo?.duracion_sesion_minutos ?? null,
        modalidad: acuerdo?.modalidad ?? null,
        autoriza_imagenes: acuerdo?.autoriza_imagenes ?? false,
        observaciones: (acuerdo?.observaciones as Record<string, string>) ?? null,
        fecha: acuerdo?.fecha ?? null,
      }}
      meta={metaImpresion(usuario.nombre)}
      firmaResponsable={firmaResponsable}
    />
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="acuerdo-terapeutico-${paciente.numero_registro}.pdf"`,
    },
  });
}
