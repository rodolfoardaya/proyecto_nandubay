import Link from "next/link";
import { EditarTurno } from "@/components/EditarTurno";
import { SeguimientoTurno, resumenSeguimiento, type Seguimiento } from "@/components/SeguimientoTurno";
import { cancelarUnaFecha, cancelarSerie } from "@/app/panel/to/agenda/actions";
import {
  DIAS,
  FRANJAS,
  aHHMM,
  bloqueoEn,
  diaDeSemana,
  formatoCorto,
  horariosDe,
  seAtiende,
  mapaDeOcupacion,
  type Bloqueo,
  type Franja,
  type Ocurrencia,
} from "@/lib/agenda";

// Grilla de la agenda: una fila cada 5 minutos y una columna por día. Cada
// turno ocupa tantas filas como dure.
// Las casillas ocupadas muestran el nombre del paciente; las libres quedan en
// blanco, que es como se lee de un vistazo dónde hay lugar.
export function AgendaGrilla({
  fechas,
  franja,
  turnos,
  bloqueos,
  base,
  seguimientos,
}: {
  fechas: string[];
  franja: Franja;
  turnos: Ocurrencia[];
  bloqueos: Bloqueo[];
  base: string;
  seguimientos: Map<string, Seguimiento>;
}) {
  const horarios = horariosDe(franja);
  const { inicio, tapada } = mapaDeOcupacion(turnos, horarios);
  const visibles = fechas.filter((f) => seAtiende(f, franja));

  if (visibles.length === 0) {
    return (
      <p className="mt-6 text-sm text-foreground/60">
        No se atiende en ese día y franja. Los sábados sólo hay turnos por la
        mañana, y los domingos no se atiende.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-black/10">
            <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-bold text-foreground/50">
              Hora
            </th>
            {visibles.map((f) => (
              <th key={f} className="min-w-32 px-2 py-2 text-left font-bold text-green-dark">
                {DIAS[(diaDeSemana(f) + 6) % 7]}
                <span className="ml-1 font-normal text-foreground/50">{formatoCorto(f)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horarios.map((hora) => {
            // Con filas de 5 minutos, rotular todas satura: sólo se escriben
            // los cuartos de hora, que es lo que sirve para ubicarse.
            const enPunto = hora.endsWith(":00");
            const enCuarto = ["00", "15", "30", "45"].includes(hora.slice(3));
            return (
              <tr key={hora} className={enPunto ? "border-t border-black/10" : ""}>
                <td
                  className={`sticky left-0 z-10 bg-white px-2 py-0.5 tabular-nums ${
                    enPunto ? "font-bold text-foreground/70" : "text-foreground/35"
                  }`}
                >
                  {enCuarto ? hora : ""}
                </td>

                {visibles.map((fecha) => {
                  // Todas las celdas se dibujan siempre. Antes se omitían las
                  // tapadas por un rowspan, y bastaba un turno superpuesto
                  // para que la fila quedara con una celda de más y todo lo
                  // que seguía se corriera una columna: los turnos aparecían
                  // en el día equivocado.
                  const continuacion = tapada.has(`${fecha}|${hora}`);
                  const bloqueo = bloqueoEn(bloqueos, fecha, hora);
                  if (bloqueo) {
                    return (
                      <td
                        key={fecha}
                        title={bloqueo.motivo}
                        className="border-l border-black/5 bg-orange/15 px-2 py-1 text-orange"
                      >
                        {hora === horarios[0] || hora.endsWith(":00") ? (
                          <span className="font-semibold">{bloqueo.motivo}</span>
                        ) : null}
                      </td>
                    );
                  }

                  const enCelda = inicio.get(`${fecha}|${hora}`) ?? [];
                  const ocupada = enCelda.length > 0 || continuacion;
                  return (
                    <td
                      key={fecha}
                      className={`border-l border-black/5 px-2 py-0.5 align-top ${
                        ocupada ? "bg-green-light/25" : ""
                      } ${enCelda.length > 1 ? "ring-1 ring-inset ring-orange" : ""}`}
                    >
                      {enCelda.length > 1 && (
                        <p className="text-[10px] font-bold text-orange">
                          {enCelda.length} turnos superpuestos
                        </p>
                      )}
                      {enCelda.map((turno) => (
                        <details key={turno.id} className="group">
                          <summary className="cursor-pointer list-none font-semibold text-green-dark">
                            {turno.paciente}
                            {turno.frecuencia !== "unica" && (
                              <span className="ml-1 font-normal text-foreground/40">
                                ↻
                              </span>
                            )}
                            {turno.estado !== "confirmado" && (
                              <span className="ml-1 font-normal text-orange">
                                ({turno.estado})
                              </span>
                            )}
                            {(() => {
                              const r = resumenSeguimiento(seguimientos.get(`${turno.id}|${fecha}`));
                              return r ? <span className="block font-normal text-[10px] text-foreground/50">{r}</span> : null;
                            })()}
                          </summary>

                          <div className="mt-1 grid gap-1 rounded-lg bg-white p-2 shadow-md">
                            <Link
                              href={`${base}/pacientes/${turno.paciente_id}`}
                              className="text-blue-mid hover:underline"
                            >
                              Ver paciente →
                            </Link>

                            <form action={cancelarUnaFecha}>
                              <input type="hidden" name="turno_id" value={turno.id} />
                              <input type="hidden" name="fecha" value={fecha} />
                              <button type="submit" className="text-orange hover:underline">
                                Cancelar solo este día
                              </button>
                            </form>

                            {turno.frecuencia !== "unica" && (
                              <form action={cancelarSerie}>
                                <input type="hidden" name="turno_id" value={turno.id} />
                                <button type="submit" className="text-orange hover:underline">
                                  Cancelar toda la serie
                                </button>
                              </form>
                            )}

                            <EditarTurno
                              turnoId={turno.id}
                              fecha={turno.fecha}
                              hora={aHHMM(turno.hora)}
                              duracionMinutos={turno.duracion_minutos}
                              frecuencia={turno.frecuencia}
                              modalidad={turno.modalidad}
                            />

                            <SeguimientoTurno
                              turnoId={turno.id}
                              fecha={fecha}
                              seguimiento={seguimientos.get(`${turno.id}|${fecha}`)}
                            />
                          </div>
                        </details>
                      ))}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { FRANJAS, aHHMM };
