"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SECCIONES_NINOS, SECCIONES_ADULTOS, CAMPOS_ACUERDO } from "@/lib/ficha-fields";
import { parseDatosFicha, parseObservaciones } from "@/lib/observaciones";
import { registrarAuditoria } from "@/lib/auditoria";

// Sube una firma manuscrita (dataURL PNG del FirmaPad) al bucket privado
// "documentos" y devuelve la ruta guardada, o null si no se firmó nada.
async function subirFirma(
  supabase: SupabaseClient,
  dataUrl: string | null,
  carpeta: string
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return null;

  const base64 = dataUrl.split(",")[1] ?? "";
  const buffer = Buffer.from(base64, "base64");
  const path = `firmas/${carpeta}/${Date.now()}.png`;

  const { error } = await supabase.storage.from("documentos").upload(path, buffer, {
    contentType: "image/png",
  });
  if (error) throw new Error(error.message);

  return path;
}

// Sube el PDF o foto original de una planilla (ficha de inicio o acuerdo
// terapéutico) al bucket privado "documentos", para guardar el
// digitalizado junto al archivo escaneado que le dio origen.
async function subirArchivo(
  supabase: SupabaseClient,
  archivo: File | null,
  carpeta: string
): Promise<string | null> {
  if (!archivo || archivo.size === 0) return null;

  const path = `${carpeta}/${Date.now()}-${archivo.name}`;
  const { error } = await supabase.storage.from("documentos").upload(path, archivo);
  if (error) throw new Error(error.message);

  return path;
}

// Busca si el paciente ya está cargado. El DNI manda cuando está; si no
// está —que es lo habitual en niños chicos— se compara apellido y nombre
// junto con la fecha de nacimiento, para no bloquear a dos homónimos.
//
// Va con el cliente de servicio porque el duplicado puede estar asignado a
// otra TO: por RLS quien da el alta no lo vería, y lo cargaría de nuevo.
async function buscarPacienteExistente({
  dni,
  nombre,
  fecha_nacimiento,
}: {
  dni: string | null;
  nombre: string;
  fecha_nacimiento: string | null;
}) {
  const admin = createAdminClient();
  const columnas = "numero_registro, nombre, activo, tos(nombre)";

  const soloDigitos = (dni ?? "").replace(/\D/g, "");
  if (soloDigitos) {
    const { data } = await admin
      .from("pacientes")
      .select(columnas)
      .eq("dni", soloDigitos)
      .maybeSingle();
    if (data) {
      return {
        numero_registro: data.numero_registro,
        nombre: data.nombre,
        activo: data.activo,
        // @ts-expect-error relación anidada
        to: data.tos?.nombre as string | undefined,
      };
    }
  }

  // Sin fecha de nacimiento el nombre solo no alcanza para afirmar que es la
  // misma persona, así que no se bloquea el alta.
  const limpio = nombre.trim().toUpperCase();
  if (!limpio || !fecha_nacimiento) return null;

  const { data } = await admin
    .from("pacientes")
    .select(columnas)
    .ilike("nombre", limpio)
    .eq("fecha_nacimiento", fecha_nacimiento)
    .maybeSingle();

  if (!data) return null;
  return {
    numero_registro: data.numero_registro,
    nombre: data.nombre,
    activo: data.activo,
    // @ts-expect-error relación anidada
    to: data.tos?.nombre as string | undefined,
  };
}

export async function crearPaciente(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  // El alta de pacientes es exclusiva de la TO; el admin solo modifica.
  if (usuario.rol === "admin") {
    throw new Error("El alta de pacientes es exclusiva de las TO.");
  }
  const supabase = await createClient();

  const { data: to } = await supabase
    .from("tos")
    .select("id")
    .eq("usuario_id", usuario.id)
    .single();
  const toAsignadaId = to?.id ?? "";

  const tipo = String(formData.get("tipo"));
  const nombre = String(formData.get("nombre"));
  const fecha_nacimiento = String(formData.get("fecha_nacimiento") || "") || null;
  // Se guarda solo con dígitos para que la comparación con lo ya cargado no
  // falle por un punto de miles de diferencia.
  const dni = String(formData.get("dni") || "").replace(/\D/g, "") || null;

  // Antes de crear nada se comprueba que el paciente no esté ya cargado. La
  // búsqueda va con el cliente de servicio a propósito: si el duplicado está
  // asignado a otra TO, por RLS esta TO no lo vería y lo cargaría de nuevo.
  const duplicado = await buscarPacienteExistente({ dni, nombre, fecha_nacimiento });
  if (duplicado) {
    throw new Error(
      `Ese paciente ya está cargado como ${duplicado.numero_registro} — ${duplicado.nombre}` +
        (duplicado.to ? `, a cargo de ${duplicado.to}.` : ".") +
        (duplicado.activo === false ? " Está dado de baja: se puede reactivar en vez de crearlo otra vez." : "")
    );
  }

  // numero_registro no se manda: lo asigna el default de la tabla
  // (generar_numero_registro(), formato LETRA+4 dígitos, ej. A0001).
  const { data: paciente, error } = await supabase
    .from("pacientes")
    .insert({
      tipo,
      nombre,
      fecha_nacimiento,
      dni,
      to_asignada_id: toAsignadaId,
    })
    .select("id")
    .single();

  if (error || !paciente) {
    // 23505 es la violación de índice único: la red de seguridad de la base
    // frente a un doble envío que le gana de mano a la comprobación previa.
    if (error?.code === "23505") {
      throw new Error(
        "Ese paciente ya está cargado. Si acabás de apretar Guardar dos veces, " +
          "revisá el listado antes de volver a intentarlo: es probable que ya esté."
      );
    }
    throw new Error(error?.message ?? "No se pudo crear el paciente");
  }

  const secciones = tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  const datos = parseDatosFicha(formData, secciones);
  const archivoFichaUrl = await subirArchivo(
    supabase,
    formData.get("archivo_ficha") as File | null,
    "fichas"
  );

  await supabase.from("fichas_inicio").insert({
    paciente_id: paciente.id,
    datos,
    archivo_adjunto_url: archivoFichaUrl,
  });

  // Acuerdo terapéutico: se completa en la misma alta si se cargó un valor
  // de sesión (digital o leído del PDF/foto manuscrita).
  const valorSesion = String(formData.get("valor_sesion") || "");
  if (valorSesion.trim()) {
    const firma_url = await subirFirma(supabase, String(formData.get("firma") || ""), "acuerdos");
    const archivoAcuerdoUrl = await subirArchivo(
      supabase,
      formData.get("archivo_acuerdo") as File | null,
      "acuerdos"
    );
    const observaciones = parseObservaciones(formData, CAMPOS_ACUERDO);
    await supabase.from("acuerdos_terapeuticos").insert({
      paciente_id: paciente.id,
      valor_sesion: Number(valorSesion),
      forma_pago: String(formData.get("forma_pago") || "") || null,
      duracion_sesion_minutos: Number(formData.get("duracion_sesion_minutos") || 45),
      modalidad: String(formData.get("modalidad") || "presencial"),
      autoriza_imagenes: formData.get("autoriza_imagenes") === "on",
      firma_url,
      archivo_adjunto_url: archivoAcuerdoUrl,
      observaciones,
    });
  }

  revalidatePath("/panel/to/pacientes");
  revalidatePath("/panel/admin/pacientes");
  redirect(`/panel/${usuario.rol}/pacientes/${paciente.id}`);
}

export async function actualizarFichaInicio(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const ficha_id = String(formData.get("ficha_id"));
  const tipo = String(formData.get("tipo"));

  const secciones = tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  const datos = parseDatosFicha(formData, secciones);

  const archivoFicha = formData.get("archivo_ficha") as File | null;
  const update: { datos: typeof datos; archivo_adjunto_url?: string } = { datos };
  if (archivoFicha && archivoFicha.size > 0) {
    const archivoFichaUrl = await subirArchivo(supabase, archivoFicha, "fichas");
    if (archivoFichaUrl) update.archivo_adjunto_url = archivoFichaUrl;
  }

  const { error } = await supabase.from("fichas_inicio").update(update).eq("id", ficha_id);
  if (error) throw new Error(error.message);

  revalidatePath(`/panel/${usuario.rol}/pacientes/${paciente_id}`);
}

export async function agregarNotaEvolucion(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));

  // La nota queda asociada a la TO asignada del paciente. Si quien la
  // carga es esa misma TO, coincide; si la carga la Admin (que no tiene
  // fila propia en `tos`), igual queda correctamente atribuida.
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("to_asignada_id")
    .eq("id", paciente_id)
    .single();

  const nota = String(formData.get("nota"));
  const objetivos_trabajados = String(formData.get("objetivos_trabajados") || "");
  const firma_url = await subirFirma(supabase, String(formData.get("firma") || ""), "evolucion");

  const { error } = await supabase.from("notas_evolucion").insert({
    paciente_id,
    to_id: paciente?.to_asignada_id,
    nota,
    objetivos_trabajados,
    firma_url,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/panel/${usuario.rol}/pacientes/${paciente_id}`);
}

export async function guardarAcuerdo(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const valor_sesion = Number(formData.get("valor_sesion"));
  const duracion_sesion_minutos = Number(formData.get("duracion_sesion_minutos") || 45);
  const modalidad = String(formData.get("modalidad") || "");
  const autoriza_imagenes = formData.get("autoriza_imagenes") === "on";
  const firma_url = await subirFirma(supabase, String(formData.get("firma") || ""), "acuerdos");
  const archivo_adjunto_url = await subirArchivo(
    supabase,
    formData.get("archivo_acuerdo") as File | null,
    "acuerdos"
  );
  const observaciones = parseObservaciones(formData, CAMPOS_ACUERDO);

  await supabase.from("acuerdos_terapeuticos").insert({
    paciente_id,
    valor_sesion,
    forma_pago: String(formData.get("forma_pago") || "") || null,
    duracion_sesion_minutos,
    modalidad,
    autoriza_imagenes,
    firma_url,
    archivo_adjunto_url,
    observaciones,
  });

  revalidatePath(`/panel/${usuario.rol}/pacientes/${paciente_id}`);
}

export async function actualizarAcuerdo(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const acuerdo_id = String(formData.get("acuerdo_id"));
  const valor_sesion = Number(formData.get("valor_sesion"));
  const duracion_sesion_minutos = Number(formData.get("duracion_sesion_minutos") || 45);
  const modalidad = String(formData.get("modalidad") || "");
  const autoriza_imagenes = formData.get("autoriza_imagenes") === "on";
  const observaciones = parseObservaciones(formData, CAMPOS_ACUERDO);

  const firmaDataUrl = String(formData.get("firma") || "");
  const firma_url = firmaDataUrl
    ? await subirFirma(supabase, firmaDataUrl, "acuerdos")
    : undefined;

  const archivoAcuerdo = formData.get("archivo_acuerdo") as File | null;
  const archivo_adjunto_url = archivoAcuerdo && archivoAcuerdo.size > 0
    ? await subirArchivo(supabase, archivoAcuerdo, "acuerdos")
    : undefined;

  const { error } = await supabase
    .from("acuerdos_terapeuticos")
    .update({
      valor_sesion,
      forma_pago: String(formData.get("forma_pago") || "") || null,
      duracion_sesion_minutos,
      modalidad,
      autoriza_imagenes,
      observaciones,
      ...(firma_url ? { firma_url } : {}),
      ...(archivo_adjunto_url ? { archivo_adjunto_url } : {}),
    })
    .eq("id", acuerdo_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/panel/${usuario.rol}/pacientes/${paciente_id}`);
}

export async function invitarFamiliar(formData: FormData) {
  const usuario = await requireRole("to", "admin");

  const paciente_id = String(formData.get("paciente_id"));
  const nombre = String(formData.get("nombre_familiar"));
  const email = String(formData.get("email_familiar"));

  const admin = createAdminClient();

  const { data: invitado, error: errorInvite } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
    });

  if (errorInvite || !invitado.user) {
    throw new Error(errorInvite?.message ?? "No se pudo invitar al familiar");
  }

  await admin.from("usuarios").insert({
    id: invitado.user.id,
    email,
    nombre,
    rol: "familiar",
  });

  await admin.from("pacientes").update({ familiar_id: invitado.user.id }).eq("id", paciente_id);

  revalidatePath(`/panel/${usuario.rol}/pacientes/${paciente_id}`);
}

// Documentos sueltos del paciente: estudios, informes de otros profesionales,
// certificados. La ficha y el acuerdo guardan su escaneo aparte; esto es para
// todo lo demás, que antes no tenía dónde ir.
export async function subirDocumentoPaciente(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const titulo = String(formData.get("titulo") || "").trim();
  const tipo = String(formData.get("tipo") || "estudio");
  const descripcion = String(formData.get("descripcion") || "").trim();
  const archivo = formData.get("archivo") as File | null;

  if (!archivo || archivo.size === 0) {
    throw new Error("No se seleccionó ningún archivo");
  }
  if (!titulo) {
    throw new Error("Falta el título del documento");
  }

  const ruta = await subirArchivo(supabase, archivo, `documentos/${paciente_id}`);
  if (!ruta) throw new Error("No se pudo subir el archivo");

  const { error } = await supabase.from("documentos_paciente").insert({
    paciente_id,
    tipo,
    titulo,
    descripcion: descripcion || null,
    archivo_url: ruta,
    nombre_original: archivo.name,
    tamano_bytes: archivo.size,
    subido_por: usuario.id,
  });

  if (error) throw new Error(error.message);

  await registrarAuditoria("carga_documento", `${titulo} — paciente ${paciente_id}`);
  revalidatePath(`/panel/${usuario.rol}/pacientes/${paciente_id}`);
}

// No se borra la fila: forma parte de la historia clínica. Se marca como no
// vigente y deja de listarse.
export async function archivarDocumentoPaciente(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const documento_id = String(formData.get("documento_id"));
  const paciente_id = String(formData.get("paciente_id"));

  const { error } = await supabase
    .from("documentos_paciente")
    .update({ vigente: false })
    .eq("id", documento_id);

  if (error) throw new Error(error.message);

  await registrarAuditoria("archivado_documento", `documento ${documento_id}`);
  revalidatePath(`/panel/${usuario.rol}/pacientes/${paciente_id}`);
}
