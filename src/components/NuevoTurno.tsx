"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useCerrarAlGuardar } from "@/components/ui/cerrar-al-guardar";
import { crearTurnoDesdeAgenda, type EstadoTurno } from "@/app/panel/to/turnos/actions";
import { CLASES_TURNO, DURACIONES } from "@/lib/agenda";
import type { Opcion } from "@/components/TareaForm";
import { PACIENTE_OTRO as OTRO } from "@/lib/agenda";

const CAMPO = "w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid";
const ETIQUETA = "grid gap-1 text-xs font-semibold text-foreground/70";

function BotonCrear() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Creando..." : "Crear turno"}
    </Button>
  );
}

export function NuevoTurno({
  pacientes,
  claseInicial = "sesion",
  etiqueta,
  fechaSugerida,
}: {
  pacientes: Opcion[];
  claseInicial?: string;
  etiqueta: string;
  fechaSugerida: string;
}) {
  const [abierto, setAbierto] = useState(false);

  // Campos controlados: React limpia los formularios no controlados cuando
  // termina una acción, y un error de validación borraba todo lo cargado.
  const [v, setV] = useState({
    fecha: fechaSugerida,
    paciente_id: "",
    paciente_libre: "",
    hora: "",
    clase: claseInicial,
    duracion_minutos: "45",
    valor_sesion: "",
    frecuencia: "unica",
    modalidad: "presencial",
  });
  const campo = (k: keyof typeof v) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setV((prev) => ({ ...prev, [k]: e.target.value })),
  });
  const elegido = v.paciente_id;
  const [estado, accion] = useActionState<EstadoTurno, FormData>(crearTurnoDesdeAgenda, null);

  // Al guardar bien se cierra sola; si hubo un error queda abierta, con el
  // motivo a la vista y sin perder lo ya escrito.
  useCerrarAlGuardar(estado, () => setAbierto(false));

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-center"
        onClick={() => setAbierto(true)}
      >
        {etiqueta}
      </Button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-green-dark">Nuevo turno</h2>
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
                Fecha *
                <input
                  type="date"
                  name="fecha"
                  required
                  className={CAMPO}
                  {...campo("fecha")}
                />
              </label>

              <label className={ETIQUETA}>
                Paciente *
                <select
                  name="paciente_id"
                  className={CAMPO}
                  {...campo("paciente_id")}
                >
                  <option value="">Elegí un paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                  <option value={OTRO}>Otro… (escribir el nombre)</option>
                </select>
              </label>

              {/* Con "Otro" elegido, el nombre viaja por su propio campo. El
                  desplegable manda el valor centinela y el servidor lo
                  entiende como "no es un paciente de la base". */}
              {elegido === OTRO && (
                <>
                  <label className={ETIQUETA}>
                    Nombre
                    <input
                      name="paciente_libre"
                      required
                      placeholder="Apellido y nombre, o con quién es la reunión"
                      className={CAMPO}
                      {...campo("paciente_libre")}
                    />
                  </label>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Hora *
                  <input type="time" name="hora" required step={300} className={CAMPO} {...campo("hora")} />
                </label>
                <label className={ETIQUETA}>
                  Tipo
                  <select name="clase" className={CAMPO} {...campo("clase")}>
                    {CLASES_TURNO.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Duración
                  <select name="duracion_minutos" className={CAMPO} {...campo("duracion_minutos")}>
                    {DURACIONES.map((d) => (
                      <option key={d.valor} value={d.valor}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={ETIQUETA}>
                  Valor de la sesión (ARS)
                  <input
                    type="number"
                    name="valor_sesion"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    className={CAMPO}
                    {...campo("valor_sesion")}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className={ETIQUETA}>
                  Repetir
                  <select name="frecuencia" className={CAMPO} {...campo("frecuencia")}>
                    <option value="unica">Una sola vez</option>
                    <option value="semanal">Todas las semanas, hasta el 31/12</option>
                  </select>
                </label>
                <label className={ETIQUETA}>
                  Modalidad
                  <select name="modalidad" className={CAMPO} {...campo("modalidad")}>
                    <option value="presencial">Presencial</option>
                    <option value="online">Online</option>
                  </select>
                </label>
              </div>

              {estado && !estado.ok && (
                <p className="rounded-xl border border-orange/40 bg-orange/10 px-3 py-2 text-sm font-semibold text-orange">
                  {estado.mensaje}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAbierto(false)}>
                  Cancelar
                </Button>
                <BotonCrear />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
