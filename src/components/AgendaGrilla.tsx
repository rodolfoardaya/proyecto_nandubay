import Link from "next/link";
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
  turnoEn,
  type Bloqueo,
  type Franja,
  type Ocurrencia,
} from "@/lib/agenda";

// Grilla de la agenda: una fila cada 15 minutos y una columna por día.
// Las casillas ocupadas muestran el nombre del paciente; las libres quedan en
// blanco, que es como se lee de un vistazo dónde hay lugar.
export function AgendaGrilla({
  fechas,
  franja,
  turnos,
  bloqueos,
  base,
}: {
  fechas: string[];
  franja: Franja;
  turnos: Ocurrencia[];
  bloqueos: Bloqueo[];
  base: string;
}) {
  const horarios = horariosDe(franja);
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
            // Marca la hora en punto para poder seguir la grilla con la vista.
            const enPunto = hora.endsWith(":00");
            return (
              <tr key={hora} className={enPunto ? "border-t border-black/10" : ""}>
                <td
                  className={`sticky left-0 z-10 bg-white px-2 py-1 tabular-nums ${
                    enPunto ? "font-bold text-foreground/70" : "text-foreground/35"
                  }`}
                >
                  {hora}
                </td>

                {visibles.map((fecha) => {
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

                  const turno = turnoEn(turnos, fecha, hora);
                  return (
                    <td
                      key={fecha}
                      className={`border-l border-black/5 px-2 py-1 ${
                        turno ? "bg-green-light/25" : ""
                      }`}
                    >
                      {turno && (
                        <details className="group">
                          <summary className="cursor-pointer list-none font-semibold text-green-dark">
                            {turno.paciente}
                            {turno.frecuencia !== "unica" && (
                              <span className="ml-1 font-normal text-foreground/40">
                                {turno.frecuencia === "semanal" ? "↻" : "↻15"}
                              </span>
                            )}
                            {turno.estado !== "confirmado" && (
                              <span className="ml-1 font-normal text-orange">
                                ({turno.estado})
                              </span>
                            )}
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
                          </div>
                        </details>
                      )}
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
