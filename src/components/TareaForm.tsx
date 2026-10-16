"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useCerrarAlGuardar } from "@/components/ui/cerrar-al-guardar";
import {
  PRIORIDADES,
  CATEGORIAS,
  codigoResponsable,
  responsableActual,
  type Tarea,
} from "@/lib/tareas";
import {
  crearTarea,
  actualizarTarea,
  type EstadoTareaForm,
} from "@/app/panel/to/tareas/actions";

const CAMPO = "w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid";
const ETIQUETA = "grid gap-1 text-xs font-semibold text-foreground/70";

export type Opcion = { id: string; nombre: string };

function BotonGuardar({ nueva }: { nueva: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Guardando..." : nueva ? "Crear tarea" : "Guardar cambios"}
    </Button>
  );
}

export function TareaForm({
  responsables,
  pacientes,
  tarea,
  disparador,
}: {
  responsables: Opcion[];
  pacientes: Opcion[];
  tarea?: Tarea;
  disparador?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const nueva = !tarea;
  const [estado, accion] = useActionState<EstadoTareaForm, FormData>(
    nueva ? crearTarea : actualizarTarea,
    null
  );

  // Los campos se manejan desde el estado y no con defaultValue a propósito:
  // React limpia los formularios no controlados cuando termina una acción, y
  // con eso un error de validación borraba todo lo que ya se había escrito.
  const [v, setV] = useState({
    titulo: tarea?.titulo ?? "",
    descripcion: tarea?.descripcion ?? "",
    prioridad: (tarea?.prioridad ?? "media") as string,
    categoria: tarea?.categoria ?? "",
    fecha_limite: tarea?.fecha_limite ?? "",
    hora_limite: tarea?.hora_limite?.slice(0, 5) ?? "",
    responsable: tarea ? responsableActual(tarea) : "",
    paciente_id: tarea?.paciente_id ?? "",
    email_aviso: tarea?.email_aviso ?? "",
    telefono_aviso: tarea?.telefono_aviso ?? "",
  });
  const [porEmail, setPorEmail] = useState(tarea?.avisar_email ?? false);
  const [porWhatsapp, setPorWhatsapp] = useState(tarea?.avisar_whatsapp ?? false);

  const campo = (k: keyof typeof v) => ({
    value: v[k],
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => setV((prev) => ({ ...prev, [k]: e.target.value })),
  });

  useCerrarAlGuardar(estado, () => setAbierto(false));

  return (
    <>
      <span onClick={() => setAbierto(true)}>
        {disparador ?? (
          <Button type="button" variant="primary">
            + Nueva
          </Button>
        )}
      </span>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-green-dark">
                {nueva ? "Nueva tarea" : "Editar tarea"}
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
              {tarea && <input type="hidden" name="tarea_id" value={tarea.id} />}

              <label className={ETIQUETA}>
                Nombre de la tarea *
                <input
                  name="titulo"
                  required
                  placeholder="Ej. Facturar a obras sociales"
                  className={CAMPO}
                  {...campo("titulo")}
                />
              </label>

              <label className={ETIQUETA}>
                Descripción
                <textarea
                  name="descripcion"
                  rows={3}
                  placeholder="En qué consiste la tarea"
                  className={CAMPO}
                  {...campo("descripcion")}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Prioridad
                  <select name="prioridad" className={CAMPO} {...campo("prioridad")}>
                    {PRIORIDADES.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={ETIQUETA}>
                  Categoría
                  <select name="categoria" className={CAMPO} {...campo("categoria")}>
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Fecha límite *
                  <input
                    type="date"
                    name="fecha_limite"
                    required
                    className={CAMPO}
                    {...campo("fecha_limite")}
                  />
                </label>
                <label className={ETIQUETA}>
                  Hora *
                  <input
                    type="time"
                    name="hora_limite"
                    required
                    className={CAMPO}
                    {...campo("hora_limite")}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Responsable
                  {/* Una tarea la puede hacer el equipo —facturar— o el propio
                      paciente —mandar un video comiendo en casa—. */}
                  <select name="responsable" className={CAMPO} {...campo("responsable")}>
                    <option value="">Quien la crea</option>
                    <optgroup label="Equipo">
                      {responsables.map((r) => (
                        <option key={r.id} value={codigoResponsable("u", r.id)}>
                          {r.nombre}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Pacientes">
                      {pacientes.map((p) => (
                        <option key={p.id} value={codigoResponsable("p", p.id)}>
                          {p.nombre}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <label className={ETIQUETA}>
                  Paciente relacionado
                  <select name="paciente_id" className={CAMPO} {...campo("paciente_id")}>
                    <option value="">Ninguno</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset className="grid gap-2 rounded-xl border border-black/10 p-3">
                <legend className="px-1 text-xs font-bold text-green-dark">
                  Aviso automático, 24 horas antes
                </legend>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="avisar_email"
                    checked={porEmail}
                    onChange={(e) => setPorEmail(e.target.checked)}
                  />
                  Por correo
                </label>
                {porEmail && (
                  <input
                    name="email_aviso"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className={CAMPO}
                    {...campo("email_aviso")}
                  />
                )}

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="avisar_whatsapp"
                    checked={porWhatsapp}
                    onChange={(e) => setPorWhatsapp(e.target.checked)}
                  />
                  Por WhatsApp
                </label>
                {porWhatsapp && (
                  <input
                    name="telefono_aviso"
                    placeholder="3815821197"
                    className={CAMPO}
                    {...campo("telefono_aviso")}
                  />
                )}
              </fieldset>

              {estado && !estado.ok && (
                <p className="rounded-xl border border-orange/40 bg-orange/10 px-3 py-2 text-sm font-semibold text-orange">
                  {estado.mensaje}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAbierto(false)}>
                  Cancelar
                </Button>
                <BotonGuardar nueva={nueva} />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
