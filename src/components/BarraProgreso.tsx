"use client";

import { useState } from "react";

// Barra de avance del objetivo trabajado: se arrastra el punto de 0 a 100 y
// la parte recorrida se dibuja más gruesa.
//
// Mientras el objetivo siga siendo el mismo, arranca en el valor de la última
// nota, para actualizarlo en vez de volver a estimarlo desde cero.
export function BarraProgreso({
  name,
  inicial = 0,
  objetivoAnterior,
}: {
  name: string;
  inicial?: number;
  objetivoAnterior?: string | null;
}) {
  const [valor, setValor] = useState(inicial);

  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className="text-xs font-semibold text-foreground/70">
          Avance del objetivo
        </label>
        <span className="text-sm font-extrabold tabular-nums text-green-dark">{valor}%</span>
      </div>

      <input
        id={name}
        name={name}
        type="range"
        min={0}
        max={100}
        step={1}
        value={valor}
        onChange={(e) => setValor(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none
                   [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                   [&::-webkit-slider-thumb]:bg-green-dark [&::-webkit-slider-thumb]:shadow
                   [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
                   [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2
                   [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-green-dark"
        // El relleno hasta el valor elegido se dibuja con un degradado duro,
        // así la parte recorrida se ve más marcada que el resto.
        style={{
          background: `linear-gradient(to right, var(--color-green-mid) 0%, var(--color-green-mid) ${valor}%, rgba(0,0,0,0.1) ${valor}%, rgba(0,0,0,0.1) 100%)`,
        }}
      />

      <div className="flex justify-between text-[10px] font-semibold text-foreground/40">
        <span>0%</span>
        <span>100%</span>
      </div>

      {objetivoAnterior && inicial > 0 && (
        <p className="text-[11px] text-foreground/50">
          Viene de {inicial}% en la nota anterior, sobre el mismo objetivo.
        </p>
      )}
    </div>
  );
}
