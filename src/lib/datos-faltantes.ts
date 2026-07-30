import type { Seccion, DatosFicha } from "./ficha-fields";

// Detecta qué datos clave todavía no se cargaron para un paciente, para
// pedirlos de a poco durante las próximas consultas en vez de exigir todo
// en el alta inicial.
export function calcularDatosFaltantes({
  paciente,
  datosFicha,
  tieneFicha,
  tieneAcuerdo,
  secciones,
  ultimaEvolucion,
}: {
  paciente: { dni: string | null; fecha_nacimiento: string | null };
  datosFicha: DatosFicha;
  tieneFicha: boolean;
  tieneAcuerdo: boolean;
  secciones: Seccion[];
  ultimaEvolucion?: string | null;
}): string[] {
  const faltantes: string[] = [];

  if (!paciente.dni) faltantes.push("DNI del paciente");
  if (!paciente.fecha_nacimiento) faltantes.push("Fecha de nacimiento");

  if (!tieneFicha) {
    faltantes.push("Ficha de inicio completa");
  } else {
    for (const seccion of secciones) {
      for (const campo of seccion.campos) {
        if (!datosFicha[campo.key]?.valor?.trim()) {
          faltantes.push(campo.label);
        }
      }
    }
  }

  if (!tieneAcuerdo) faltantes.push("Acuerdo terapéutico");

  // La historia clínica se espera actualizar mensualmente: si ya hay al
  // menos una nota cargada pero la última quedó vieja, avisar.
  if (ultimaEvolucion) {
    const dias = Math.floor((Date.now() - new Date(ultimaEvolucion).getTime()) / 86400000);
    if (dias > 31) faltantes.push(`Historia clínica sin actualizar hace ${dias} días`);
  }

  return faltantes;
}
