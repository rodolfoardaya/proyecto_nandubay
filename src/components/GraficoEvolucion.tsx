"use client";

import { useState } from "react";
import { fechaLegible } from "@/lib/fecha";

export type PuntoEvolucion = {
  fecha: string; // AAAA-MM-DD
  progreso: number; // 0 a 100
  objetivo: string | null;
};

// Colores: una sola serie, así que no hace falta una paleta categórica. Se usa
// el verde del sitio, que da 6,12:1 de contraste sobre blanco. La grilla va en
// un gris muy claro, a propósito: tiene que quedar detrás del dato.
const VERDE = "#1F6F4A";
const VERDE_RELLENO = "#3FA35C";
const GRIS_GRILLA = "#E5E5E5";
// La marca de cambio de objetivo va un paso más oscura que la grilla: tiene
// que leerse como una anotación, no confundirse con el fondo.
const GRIS_MARCA = "#B4B4B4";

// Medidas del dibujo. El SVG escala solo; estas son unidades internas.
const ANCHO = 720;
const ALTO = 300;
const M = { arriba: 18, derecha: 20, abajo: 44, izquierda: 42 };
const AREA_ANCHO = ANCHO - M.izquierda - M.derecha;
const AREA_ALTO = ALTO - M.arriba - M.abajo;

function aDias(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 86400000;
}

export function GraficoEvolucion({ puntos }: { puntos: PuntoEvolucion[] }) {
  const [abierto, setAbierto] = useState(false);
  const [encima, setEncima] = useState<number | null>(null);

  // Las notas vienen de la más nueva a la más vieja; el gráfico necesita el
  // orden contrario, que es como se lee una evolución.
  const datos = [...puntos].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const dias = datos.map((p) => aDias(p.fecha));
  const min = Math.min(...dias);
  const max = Math.max(...dias);
  // Con una sola nota, o varias del mismo día, no hay rango: se centra.
  const rango = max - min;

  const x = (i: number) => (rango === 0 ? M.izquierda + AREA_ANCHO / 2 : M.izquierda + ((dias[i] - min) / rango) * AREA_ANCHO);
  const y = (v: number) => M.arriba + AREA_ALTO - (v / 100) * AREA_ALTO;

  const linea = datos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.progreso)}`).join(" ");
  const area =
    datos.length > 1
      ? `${linea} L ${x(datos.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`
      : "";

  // Se rotulan sólo el primero y el último: un número sobre cada punto tapa
  // el dibujo y deja de leerse la tendencia, que es lo que importa.
  const rotulados = new Set(datos.length > 1 ? [0, datos.length - 1] : [0]);

  // Dónde cambió el objetivo trabajado. Sin esta marca, la línea daría a
  // entender que todo el recorrido fue sobre lo mismo.
  const cambios = datos
    .map((p, i) => ({ i, cambio: i > 0 && (p.objetivo ?? "") !== (datos[i - 1].objetivo ?? "") }))
    .filter((c) => c.cambio)
    .map((c) => c.i);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-sm font-bold text-blue-mid hover:underline"
      >
        Gráfico de evolución
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-green-dark">Evolución del objetivo</h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-sm font-bold text-foreground/40 hover:text-orange"
              >
                Cerrar
              </button>
            </div>

            {datos.length === 0 ? (
              <p className="mt-4 text-sm text-foreground/60">
                Todavía no hay notas con avance cargado. El avance se carga con la
                barra que está debajo del objetivo trabajado, al agregar una nota.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-foreground/60">
                  Porcentaje estimado de avance en cada sesión registrada.
                </p>

                <div className="relative mt-3">
                  <svg
                    viewBox={`0 0 ${ANCHO} ${ALTO}`}
                    className="w-full"
                    role="img"
                    aria-label="Gráfico de avance del objetivo a lo largo del tiempo"
                  >
                    {/* Grilla y escala vertical, en gris claro: va detrás. */}
                    {[0, 25, 50, 75, 100].map((v) => (
                      <g key={v}>
                        <line
                          x1={M.izquierda}
                          x2={ANCHO - M.derecha}
                          y1={y(v)}
                          y2={y(v)}
                          stroke={GRIS_GRILLA}
                          strokeWidth={1}
                        />
                        <text
                          x={M.izquierda - 8}
                          y={y(v) + 4}
                          textAnchor="end"
                          className="fill-foreground/40"
                          style={{ fontSize: 11 }}
                        >
                          {v}%
                        </text>
                      </g>
                    ))}

                    {area && <path d={area} fill={VERDE_RELLENO} opacity={0.12} />}
                    {datos.length > 1 && (
                      <path d={linea} fill="none" stroke={VERDE} strokeWidth={2} strokeLinejoin="round" />
                    )}

                    {/* Dónde cambió el objetivo trabajado. */}
                    {cambios.map((i) => (
                      <line
                        key={`c${i}`}
                        x1={(x(i) + x(i - 1)) / 2}
                        x2={(x(i) + x(i - 1)) / 2}
                        y1={M.arriba}
                        y2={M.arriba + AREA_ALTO}
                        stroke={GRIS_MARCA}
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                    ))}

                    {datos.map((p, i) => (
                      <g key={`${p.fecha}-${i}`}>
                        {/* Zona de contacto más grande que el punto, para que
                            no haya que apuntar con precisión. */}
                        <circle
                          cx={x(i)}
                          cy={y(p.progreso)}
                          r={14}
                          fill="transparent"
                          onMouseEnter={() => setEncima(i)}
                          onMouseLeave={() => setEncima(null)}
                        />
                        <circle
                          cx={x(i)}
                          cy={y(p.progreso)}
                          r={encima === i ? 7 : 5}
                          fill={VERDE}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                        {rotulados.has(i) && (
                          <text
                            x={x(i)}
                            y={y(p.progreso) - 12}
                            textAnchor="middle"
                            className="fill-green-dark"
                            style={{ fontSize: 12, fontWeight: 700 }}
                          >
                            {p.progreso}%
                          </text>
                        )}
                      </g>
                    ))}

                    {/* Escala de fechas: sólo los extremos, para que no se
                        pisen cuando hay muchas sesiones. */}
                    <text
                      x={M.izquierda}
                      y={ALTO - 16}
                      textAnchor="start"
                      className="fill-foreground/50"
                      style={{ fontSize: 11 }}
                    >
                      {fechaLegible(datos[0].fecha + "T12:00:00")}
                    </text>
                    {datos.length > 1 && (
                      <text
                        x={ANCHO - M.derecha}
                        y={ALTO - 16}
                        textAnchor="end"
                        className="fill-foreground/50"
                        style={{ fontSize: 11 }}
                      >
                        {fechaLegible(datos[datos.length - 1].fecha + "T12:00:00")}
                      </text>
                    )}
                  </svg>

                  {encima !== null && (
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-green-dark px-3 py-2 text-xs text-white shadow-lg"
                      style={{
                        left: `${(x(encima) / ANCHO) * 100}%`,
                        top: `${(y(datos[encima].progreso) / ALTO) * 100 - 3}%`,
                      }}
                    >
                      <span className="font-bold">{datos[encima].progreso}%</span>
                      <span className="ml-2 opacity-80">
                        {fechaLegible(datos[encima].fecha + "T12:00:00")}
                      </span>
                      {datos[encima].objetivo && (
                        <span className="mt-0.5 block max-w-56 opacity-80">
                          {datos[encima].objetivo}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {cambios.length > 0 && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Las líneas punteadas marcan dónde cambió el objetivo trabajado.
                  </p>
                )}

                {/* Los mismos datos en texto: hace falta para quien no
                    distingue el dibujo, y para copiar un valor puntual. */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-semibold text-blue-mid">
                    Ver los valores en una tabla
                  </summary>
                  <table className="mt-2 w-full text-left text-xs">
                    <thead className="border-b border-black/10 text-foreground/50">
                      <tr>
                        <th className="py-1 font-bold">Fecha</th>
                        <th className="py-1 font-bold">Avance</th>
                        <th className="py-1 font-bold">Objetivo trabajado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...datos].reverse().map((p, i) => (
                        <tr key={`t${i}`} className="border-b border-black/5">
                          <td className="py-1 tabular-nums">
                            {fechaLegible(p.fecha + "T12:00:00")}
                          </td>
                          <td className="py-1 font-semibold tabular-nums text-green-dark">
                            {p.progreso}%
                          </td>
                          <td className="py-1 text-foreground/60">{p.objetivo ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
