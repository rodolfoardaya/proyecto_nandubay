"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function cargarFactura(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id"));
  const fecha_facturacion = String(formData.get("fecha_facturacion") || "") || null;
  const monto = formData.get("monto") ? Number(formData.get("monto")) : null;
  const fecha_vencimiento_estimada = String(formData.get("fecha_vencimiento_estimada") || "") || null;
  const archivo = formData.get("archivo") as File;

  let to_id: string;
  if (usuario.rol === "to") {
    const { data: to } = await supabase.from("tos").select("id").eq("usuario_id", usuario.id).single();
    to_id = to?.id ?? "";
  } else {
    const { data: paciente } = await supabase.from("pacientes").select("to_asignada_id").eq("id", paciente_id).single();
    to_id = paciente?.to_asignada_id ?? "";
  }

  let archivo_pdf_url: string | null = null;
  if (archivo && archivo.size > 0) {
    const path = `${to_id}/${Date.now()}-${archivo.name}`;
    const { error: uploadError } = await supabase.storage.from("facturas").upload(path, archivo);
    if (uploadError) throw new Error(uploadError.message);
    archivo_pdf_url = path;
  }

  const { error } = await supabase.from("facturas").insert({
    to_id,
    paciente_id,
    archivo_pdf_url,
    fecha_facturacion,
    monto,
    fecha_vencimiento_estimada,
    estado_cobro: "a_cobrar",
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/panel/${usuario.rol}/facturacion`);
}

export async function actualizarEstadoCobro(formData: FormData) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const factura_id = String(formData.get("factura_id"));
  const estado_cobro = String(formData.get("estado_cobro"));

  await supabase.from("facturas").update({ estado_cobro }).eq("id", factura_id);

  revalidatePath(`/panel/${usuario.rol}/facturacion`);
}
