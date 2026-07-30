import { Button } from "@/components/ui/Button";

// La consulta de una historia clínica exige la coincidencia de al menos dos
// datos del paciente (ej. DNI + apellido, o DNI + Nº de paciente), para que
// nadie abra una historia por tanteo con un solo dato.
export const MINIMO_CRITERIOS = 2;

export type CriteriosBusqueda = {
  nro: string;
  dni: string;
  nombre: string;
};

export function leerCriterios(params: Record<string, string | string[] | undefined>): CriteriosBusqueda {
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  return {
    nro: uno(params.nro),
    dni: uno(params.dni),
    nombre: uno(params.nombre),
  };
}

export function contarCriterios(c: CriteriosBusqueda): number {
  return [c.nro, c.dni, c.nombre].filter(Boolean).length;
}

const CAMPO = "rounded-xl border border-black/10 px-4 py-3 text-sm outline-blue-mid";

export function BuscadorPacientes({
  criterios,
  base,
}: {
  criterios: CriteriosBusqueda;
  base: string;
}) {
  const cantidad = contarCriterios(criterios);

  return (
    <form action={base} className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
      <p className="font-bold text-green-dark">Buscar una historia clínica</p>
      <p className="mt-1 text-xs text-foreground/60">
        Completá al menos dos datos del paciente para abrir su historia.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-foreground/70">
          Nº de paciente
          <input name="nro" defaultValue={criterios.nro} placeholder="A0001" className={`mt-1 w-full ${CAMPO}`} />
        </label>
        <label className="text-xs font-semibold text-foreground/70">
          DNI
          <input name="dni" defaultValue={criterios.dni} placeholder="Sin puntos" className={`mt-1 w-full ${CAMPO}`} />
        </label>
        <label className="text-xs font-semibold text-foreground/70">
          Apellido y nombre
          <input name="nombre" defaultValue={criterios.nombre} className={`mt-1 w-full ${CAMPO}`} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
        {cantidad > 0 && (
          <a href={base} className="text-xs font-semibold text-blue-mid hover:underline">
            Limpiar búsqueda
          </a>
        )}
        {cantidad === 1 && (
          <span className="text-xs font-semibold text-orange">
            Falta un dato más: la búsqueda necesita dos coincidencias.
          </span>
        )}
      </div>
    </form>
  );
}
