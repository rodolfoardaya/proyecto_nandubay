// Datos identificatorios del paciente que no viven dentro de la ficha: el
// CUIL y la edad.
//
// Las fechas se manejan como texto "AAAA-MM-DD" y no como objetos Date, por
// la misma razón que en la agenda: al convertir de un lado a otro la zona
// horaria corre el día, y una edad que cambia de valor según la hora a la que
// se abra la ficha es un error que se ve.

import { hoyIso } from "@/lib/agenda";

// ── CUIL ───────────────────────────────────────────────────────────────────

// El CUIL son 11 dígitos: 2 de prefijo, los 8 del DNI y 1 verificador.
// Se guarda con guiones, que es como se escribe y como se lee en voz alta.
//
// Acepta lo que le tipeen —con guiones, con puntos, o los 11 dígitos
// seguidos— y devuelve null si no llega a 11 dígitos, que es la única forma
// de saber que está incompleto.
export function normalizarCuil(entrada: string | null | undefined): string | null {
  const digitos = (entrada ?? "").replace(/\D/g, "");
  if (digitos.length !== 11) return null;
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

// Los 8 del medio. `dni` se sigue guardando aparte porque de él dependen el
// índice antiduplicados y la búsqueda.
export function dniDeCuil(cuil: string | null | undefined): string | null {
  const digitos = (cuil ?? "").replace(/\D/g, "");
  return digitos.length === 11 ? digitos.slice(2, 10) : null;
}

// Para mostrar: el CUIL si está, y si no el DNI suelto de los pacientes
// cargados antes de que existiera este campo.
export function documentoVisible(
  cuil: string | null | undefined,
  dni: string | null | undefined
): string | null {
  return cuil?.trim() || dni?.trim() || null;
}

// ── Edad ───────────────────────────────────────────────────────────────────

export type Edad = { anios: number; meses: number; texto: string };

// Años y meses cumplidos. No se carga a mano: sale de la fecha de nacimiento
// y del día en que se mira la ficha.
export function edadDe(
  fechaNacimiento: string | null | undefined,
  hoy: string = hoyIso()
): Edad | null {
  if (!fechaNacimiento || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) return null;
  if (fechaNacimiento > hoy) return null; // fecha futura: no hay edad que mostrar

  const [anioNac, mesNac, diaNac] = fechaNacimiento.split("-").map(Number);
  const [anioHoy, mesHoy, diaHoy] = hoy.split("-").map(Number);

  let anios = anioHoy - anioNac;
  let meses = mesHoy - mesNac;

  // Todavía no llegó el día del mes: ese mes no está cumplido. La excepción
  // es el nacido un 31 mirado en un mes que no tiene 31: el 28 de febrero ya
  // cumplió el mes, y sin esto quedaría un mes corto.
  if (diaHoy < diaNac) {
    const ultimoDiaDelMes = new Date(anioHoy, mesHoy, 0).getDate();
    const elMesNoLlegaAEseDia = diaNac > ultimoDiaDelMes && diaHoy === ultimoDiaDelMes;
    if (!elMesNoLlegaAEseDia) meses -= 1;
  }

  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  return { anios, meses, texto: textoEdad(anios, meses) };
}

function textoEdad(anios: number, meses: number): string {
  const enAnios = anios === 1 ? "1 año" : `${anios} años`;
  const enMeses = meses === 1 ? "1 mes" : `${meses} meses`;

  if (anios === 0 && meses === 0) return "menos de un mes";
  if (anios === 0) return enMeses;
  if (meses === 0) return enAnios;
  return `${enAnios} y ${enMeses}`;
}
