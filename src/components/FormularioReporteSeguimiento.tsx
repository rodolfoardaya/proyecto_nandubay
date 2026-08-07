"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { hoyIso } from "@/lib/agenda";

const CAMPO = "rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid";

const VARIABLES = [
  { valor: "adeudados", label: "Adeudados", ayuda: "Lo que falta cobrar" },
  { valor: "ausentes", label: "Ausencias", ayuda: "Turnos a los que no vinieron" },
  { valor: "pagados", label: "Pagados", ayuda: "Cobrados en el período" },
  { valor: "obra_social", label: "Obra social", ayuda: "A facturar a la obra social" },
  { valor: "presentes", label: "Asistencias", ayuda: "Turnos a los que sí vinieron" },
];

function primerDiaDelMes() {
  const h = hoyIso();
  return `${h.slice(0, 7)}-01`;
}

// Reporte de seguimiento con período y variables a elección. El caso típico
// es el cierre de mes: qué quedó adeudado entre el 1 y el 31.
export function FormularioReporteSeguimiento() {
  const [desde, setDesde] = useState(primerDiaDelMes());
  const [hasta, setHasta] = useState(hoyIso());
  const [elegidas, setElegidas] = useState<string[]>(["adeudados", "ausentes"]);

  function alternar(v: string) {
    setElegidas((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  const url = `/api/reporte-seguimiento?desde=${desde}&hasta=${hasta}&incluir=${elegidas.join(",")}`;
  const listo = elegidas.length > 0 && desde <= hasta;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-foreground/70">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className={CAMPO}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-foreground/70">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className={CAMPO}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setDesde(primerDiaDelMes());
            setHasta(hoyIso());
          }}
          className="rounded-full border border-black/10 px-3 py-1.5 font-semibold"
        >
          Este mes
        </button>
        <button
          type="button"
          onClick={() => {
            const h = hoyIso();
            const [a, m] = h.split("-").map(Number);
            const mesAnterior = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
            const ultimo = new Date(Number(mesAnterior.slice(0, 4)), Number(mesAnterior.slice(5)), 0).getDate();
            setDesde(`${mesAnterior}-01`);
            setHasta(`${mesAnterior}-${ultimo}`);
          }}
          className="rounded-full border border-black/10 px-3 py-1.5 font-semibold"
        >
          Mes pasado
        </button>
      </div>

      <fieldset>
        <legend className="text-xs font-semibold text-foreground/70">
          Qué incluir en el reporte
        </legend>
        <div className="mt-2 grid gap-1.5">
          {VARIABLES.map((v) => (
            <label key={v.valor} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={elegidas.includes(v.valor)}
                onChange={() => alternar(v.valor)}
                className="mt-1"
              />
              <span>
                {v.label}
                <span className="block text-xs text-foreground/50">{v.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {!listo && (
        <p className="text-xs text-orange">
          {elegidas.length === 0
            ? "Elegí al menos una variable para el reporte."
            : "La fecha de inicio tiene que ser anterior a la de fin."}
        </p>
      )}

      <a href={listo ? url : undefined} target="_blank" rel="noreferrer" className="justify-self-start">
        <Button variant="primary" disabled={!listo}>
          Generar reporte (PDF)
        </Button>
      </a>
    </div>
  );
}
