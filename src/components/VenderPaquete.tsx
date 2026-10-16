"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useCerrarAlGuardar } from "@/components/ui/cerrar-al-guardar";
import { venderPaquete, type EstadoPaquete } from "@/app/panel/to/facturacion/paquetes-actions";
import type { Opcion } from "@/components/TareaForm";

const CAMPO = "w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid";
const ETIQUETA = "grid gap-1 text-xs font-semibold text-foreground/70";

function BotonVender() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Registrando..." : "Vender paquete"}
    </Button>
  );
}

export function VenderPaquete({ pacientes }: { pacientes: Opcion[] }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion] = useActionState<EstadoPaquete, FormData>(venderPaquete, null);

  // Campos controlados: React limpia los formularios no controlados al
  // terminar una acción, y un error de validación borraba todo lo cargado.
  const [v, setV] = useState({
    paciente_id: "",
    cantidad_sesiones: "8",
    precio_total: "",
    fecha_inicio: "",
    fecha_fin: "",
    nota: "",
  });
  const [pagado, setPagado] = useState(false);
  const campo = (k: keyof typeof v) => ({
    value: v[k],
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => setV((prev) => ({ ...prev, [k]: e.target.value })),
  });

  // Al guardar bien se cierra sola; si hubo un error queda abierta, con el
  // motivo a la vista y sin perder lo ya escrito.
  useCerrarAlGuardar(estado, () => setAbierto(false));

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setAbierto(true)}>
        + Vender paquete
      </Button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-green-dark">
                Vender paquete de sesiones
              </h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-sm font-bold text-foreground/40 hover:text-orange"
              >
                Cerrar
              </button>
            </div>

            <form action={accion} className="mt-4 grid gap-3">
              <label className={ETIQUETA}>
                Paciente *
                <select name="paciente_id" required className={CAMPO} {...campo("paciente_id")}>
                  <option value="" disabled>
                    Elegí un paciente
                  </option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Sesiones *
                  <input
                    type="number"
                    name="cantidad_sesiones"
                    required
                    min={1}
                    step={1}
                    className={CAMPO}
                    {...campo("cantidad_sesiones")}
                  />
                </label>
                <label className={ETIQUETA}>
                  Precio total (ARS) *
                  <input
                    type="number"
                    name="precio_total"
                    required
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    className={CAMPO}
                    {...campo("precio_total")}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Fecha de inicio
                  <input type="date" name="fecha_inicio" className={CAMPO} {...campo("fecha_inicio")} />
                </label>
                <label className={ETIQUETA}>
                  Fecha de terminación
                  <input type="date" name="fecha_fin" className={CAMPO} {...campo("fecha_fin")} />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                <input type="checkbox" name="pagado" checked={pagado} onChange={(e) => setPagado(e.target.checked)} />
                Pagado
                <span className="font-normal text-foreground/50">
                  — sin tildar queda como adeudado
                </span>
              </label>

              <label className={ETIQUETA}>
                Nota
                <textarea
                  name="nota"
                  rows={2}
                  placeholder="Anotaciones relevantes"
                  className={CAMPO}
                  {...campo("nota")}
                />
              </label>

              {estado && !estado.ok && (
                <p className="rounded-xl border border-orange/40 bg-orange/10 px-3 py-2 text-sm font-semibold text-orange">
                  {estado.mensaje}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAbierto(false)}>
                  Cancelar
                </Button>
                <BotonVender />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
