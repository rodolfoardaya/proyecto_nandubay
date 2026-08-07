"use client";
import { BotonEnvio } from "@/components/ui/BotonEnvio";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { crearBloqueo } from "@/app/panel/to/agenda/actions";

const TIPOS = [
  { valor: "feriado", label: "Feriado" },
  { valor: "capacitacion", label: "Capacitación" },
  { valor: "viaje", label: "Viaje" },
  { valor: "licencia", label: "Licencia médica / enfermedad" },
  { valor: "estudios", label: "Estudios médicos" },
  { valor: "otro", label: "Otro" },
];

const CAMPO = "rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid";

export function FormularioBloqueo({
  esAdmin,
  toId,
  fechaSugerida,
}: {
  esAdmin: boolean;
  toId: string;
  fechaSugerida: string;
}) {
  const [todoElDia, setTodoElDia] = useState(true);
  const [frecuencia, setFrecuencia] = useState("unica");

  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-semibold text-blue-mid">
        Cargar un bloqueo
      </summary>

      <form action={crearBloqueo} className="mt-3 grid max-w-xl gap-3">
        <input type="hidden" name="to_id" value={toId} />

        <input required name="motivo" placeholder="Motivo (ej. Feriado nacional)" className={CAMPO} />

        <select name="tipo" className={CAMPO}>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="grid gap-1 text-xs font-semibold text-foreground/70">
          ¿Se repite?
          <select
            name="frecuencia"
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value)}
            className={CAMPO}
          >
            <option value="unica">No, es por única vez</option>
            <option value="semanal">Todas las semanas, el mismo día</option>
            <option value="mensual">Todos los meses, el mismo día</option>
          </select>
          {frecuencia === "mensual" && (
            <span className="text-xs font-normal text-foreground/60">
              Para reservarte tiempo fijo, por ejemplo para escribir informes.
            </span>
          )}
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-foreground/70">
            {frecuencia === "unica" ? "Desde" : "Primera vez"}
            <input required type="date" name="fecha_desde" defaultValue={fechaSugerida} className={CAMPO} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-foreground/70">
            {frecuencia === "unica" ? "Hasta (si es un solo día, dejalo igual)" : "Repetir hasta"}
            <input
              type="date"
              name="fecha_hasta"
              defaultValue={frecuencia === "unica" ? fechaSugerida : `${fechaSugerida.slice(0, 4)}-12-31`}
              className={CAMPO}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="todo_el_dia"
            checked={todoElDia}
            onChange={(e) => setTodoElDia(e.target.checked)}
          />
          Todo el día
        </label>

        {!todoElDia && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-foreground/70">
              Hora desde
              <input type="time" name="hora_desde" step={900} defaultValue="08:00" className={CAMPO} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-foreground/70">
              Hora hasta
              <input type="time" name="hora_hasta" step={900} defaultValue="13:00" className={CAMPO} />
            </label>
          </div>
        )}

        {esAdmin && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="para_todas" className="mt-1" />
            <span>
              Aplicar a todas las TO
              <span className="block text-xs text-foreground/60">
                Para un feriado. Crea una copia del bloqueo en la agenda de cada
                TO activa.
              </span>
            </span>
          </label>
        )}

        <BotonEnvio variant="secondary" className="justify-self-start">
          Guardar bloqueo
        </BotonEnvio>
      </form>
    </details>
  );
}
