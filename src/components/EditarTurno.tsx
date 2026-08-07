import { actualizarTurno } from "@/app/panel/to/turnos/actions";

const CAMPO = "w-full rounded-lg border border-black/10 px-2 py-1 text-xs outline-blue-mid";

// Edición de un turno ya cargado. Antes sólo se podía crear o cancelar, así
// que corregir una duración obligaba a borrarlo y volver a tipear todo.
export function EditarTurno({
  turnoId,
  fecha,
  hora,
  duracionMinutos,
  frecuencia,
  modalidad,
}: {
  turnoId: string;
  fecha: string;
  hora: string;
  duracionMinutos: number;
  frecuencia: string;
  modalidad: string;
}) {
  return (
    <details>
      <summary className="cursor-pointer text-blue-mid hover:underline">Editar turno</summary>

      <form action={actualizarTurno} className="mt-2 grid gap-1.5">
        <input type="hidden" name="turno_id" value={turnoId} />

        <label className="grid gap-0.5 text-[10px] font-bold uppercase text-foreground/50">
          Fecha
          <input type="date" name="fecha" defaultValue={fecha} className={CAMPO} />
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          <label className="grid gap-0.5 text-[10px] font-bold uppercase text-foreground/50">
            Hora
            <input type="time" name="hora" step={300} defaultValue={hora} className={CAMPO} />
          </label>
          <label className="grid gap-0.5 text-[10px] font-bold uppercase text-foreground/50">
            Minutos
            <input
              type="number"
              name="duracion_minutos"
              defaultValue={duracionMinutos}
              min={5}
              max={480}
              step={5}
              className={CAMPO}
            />
          </label>
        </div>

        <label className="grid gap-0.5 text-[10px] font-bold uppercase text-foreground/50">
          Repetición
          <select name="frecuencia" defaultValue={frecuencia} className={CAMPO}>
            <option value="unica">Una sola vez</option>
            <option value="semanal">Todas las semanas</option>
          </select>
        </label>

        <label className="grid gap-0.5 text-[10px] font-bold uppercase text-foreground/50">
          Modalidad
          <select name="modalidad" defaultValue={modalidad} className={CAMPO}>
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
          </select>
        </label>

        <button
          type="submit"
          className="justify-self-start rounded-full bg-blue-mid px-3 py-1 text-[11px] font-bold text-white"
        >
          Guardar cambios
        </button>

        <p className="text-[10px] text-foreground/50">
          Los cambios se reflejan también en Google Calendar.
        </p>
      </form>
    </details>
  );
}
