"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type EstadoPaquete = { ok: boolean; mensaje: string } | null;

// Venta de un paquete de sesiones. Por ahora se registra y se cobra: no
// descuenta sesiones automáticamente a medida que se dan los turnos. Eso
// requiere decidir qué pasa cuando el paquete vence, cuando hay dos a la vez
// o cuando se cancela un turno, y todavía no está definido.
export async function venderPaquete(
  _previo: EstadoPaquete,
  formData: FormData
): Promise<EstadoPaquete> {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const paciente_id = String(formData.get("paciente_id") || "");
  const cantidad_sesiones = Math.trunc(Number(formData.get("cantidad_sesiones") || 0));
  const precio_total = Number(formData.get("precio_total") || 0);

  if (!paciente_id) return { ok: false, mensaje: "Elegí el paciente." };
  if (!Number.isFinite(cantidad_sesiones) || cantidad_sesiones < 1) {
    return { ok: false, mensaje: "La cantidad de sesiones tiene que ser un número entero mayor que cero." };
  }
  if (!Number.isFinite(precio_total) || precio_total <= 0) {
    return { ok: false, mensaje: "Cargá el precio total del paquete." };
  }

  const fecha_inicio = String(formData.get("fecha_inicio") || "") || null;
  const fecha_fin = String(formData.get("fecha_fin") || "") || null;
  if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) {
    return { ok: false, mensaje: "La fecha de terminación no puede ser anterior a la de inicio." };
  }

  // El paquete queda a cargo de la TO del paciente, igual que sus turnos.
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("to_asignada_id, numero_registro, nombre")
    .eq("id", paciente_id)
    .single();

  const { error } = await supabase.from("paquetes_sesiones").insert({
    paciente_id,
    to_id: paciente?.to_asignada_id ?? null,
    cantidad_sesiones,
    precio_total,
    fecha_inicio,
    fecha_fin,
    pagado: formData.get("pagado") === "on",
    nota: String(formData.get("nota") || "").trim() || null,
    creado_por: usuario.id,
  });

  if (error) return { ok: false, mensaje: `No se pudo registrar el paquete: ${error.message}` };

  await registrarAuditoria(
    "venta_paquete",
    `${paciente?.numero_registro ?? paciente_id} — ${cantidad_sesiones} sesiones`
  );
  revalidatePath("/panel/to/facturacion");
  revalidatePath("/panel/admin/facturacion");

  return { ok: true, mensaje: `Paquete de ${cantidad_sesiones} sesiones registrado.` };
}

export async function cambiarPagoPaquete(formData: FormData) {
  await requireRole("to", "admin");
  const supabase = await createClient();

  const id = String(formData.get("paquete_id") || "");
  const pagado = formData.get("pagado") === "si";

  await supabase.from("paquetes_sesiones").update({ pagado }).eq("id", id);

  await registrarAuditoria("pago_paquete", `${id} → ${pagado ? "pagado" : "adeudado"}`);
  revalidatePath("/panel/to/facturacion");
  revalidatePath("/panel/admin/facturacion");
}
