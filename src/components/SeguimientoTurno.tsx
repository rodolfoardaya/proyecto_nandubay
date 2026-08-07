import { registrarSeguimiento } from "@/app/panel/to/agenda/actions";

export type Seguimiento = {
  turno_id: string;
  fecha: string;
  asistencia: string | null;
  pago: string | null;
  observacion_asistencia: string | null;
  observacion_pago: string | null;
};

const ETIQUETA_ASISTENCIA: Record<string, string> = {
  presente: "Presente",
  ausente: "Ausente",
};

const ETIQUETA_PAGO: Record<string, string> = {
  pagado: "Pagado",
  adeudado: "Adeudado",
  obra_social: "Obra social",
};

// Resumen corto para mostrar dentro de la casilla de la agenda.
export function resumenSeguimiento(s: Seguimiento | undefined) {
  if (!s) return null;
  const partes = [
    s.asistencia ? ETIQUETA_ASISTENCIA[s.asistencia] : null,
    s.pago ? ETIQUETA_PAGO[s.pago] : null,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

const CAMPO = "w-full rounded-lg border border-black/10 px-2 py-1 text-xs outline-blue-mid";

// Seguimiento de una fecha concreta del turno: asistencia y cobro, cada uno
// con su observación. Sirve para dejar el motivo de una ausencia, o cuándo
// va a abonar lo que quedó adeudado.
export function SeguimientoTurno({
  turnoId,
  fecha,
  seguimiento,
}: {
  turnoId: string;
  fecha: string;
  seguimiento?: Seguimiento;
}) {
  return (
    <form action={registrarSeguimiento} className="grid gap-1.5 border-t border-black/10 pt-2">
      <input type="hidden" name="turno_id" value={turnoId} />
      <input type="hidden" name="fecha" value={fecha} />

      <label className="grid gap-0.5 text-[10px] font-bold uppercase text-foreground/50">
        Asistencia
        <select name="asistencia" defaultValue={seguimiento?.asistencia ?? ""} className={CAMPO}>
          <option value="">Sin registrar</option>
          <option value="presente">Presente</option>
          <option value="ausente">Ausente</option>
        </select>
      </label>
      <input
        name="observacion_asistencia"
        defaultValue={seguimiento?.observacion_asistencia ?? ""}
        placeholder="Motivo, si faltó"
        className={CAMPO}
      />

      <label className="mt-1 grid gap-0.5 text-[10px] font-bold uppercase text-foreground/50">
        Cobro
        <select name="pago" defaultValue={seguimiento?.pago ?? ""} className={CAMPO}>
          <option value="">Sin registrar</option>
          <option value="pagado">Pagado</option>
          <option value="adeudado">Adeudado</option>
          <option value="obra_social">Obra social</option>
        </select>
      </label>
      <input
        name="observacion_pago"
        defaultValue={seguimiento?.observacion_pago ?? ""}
        placeholder="Ej. abona el 22/08"
        className={CAMPO}
      />

      <button
        type="submit"
        className="justify-self-start rounded-full bg-green-mid px-3 py-1 text-[11px] font-bold text-white"
      >
        Guardar seguimiento
      </button>
    </form>
  );
}
