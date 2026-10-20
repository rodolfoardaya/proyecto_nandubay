// Reglas de la agenda del consultorio.
//
// Se atiende de lunes a viernes en dos franjas, y los sábados sólo por la
// mañana. Los domingos no se atiende. La unidad mínima es de 5 minutos.
//
// Las fechas se manejan como texto "AAAA-MM-DD" en vez de objetos Date: al
// convertir de un lado a otro, la zona horaria corre el día y los turnos
// terminan apareciendo en la casilla equivocada.

export type Franja = "manana" | "tarde";
export type Vista = "dia" | "semana" | "mes";

// Horario de atención. Ya no está fijo en el código: cada TO tiene el suyo y
// se edita desde el panel del administrador. Esto es sólo el valor por
// omisión, el que se usa mientras no se haya cargado otro.
export type HorarioTO = {
  manana_desde: string;
  manana_hasta: string;
  tarde_desde: string;
  tarde_hasta: string;
};

export const HORARIO_POR_OMISION: HorarioTO = {
  manana_desde: "08:00",
  manana_hasta: "13:00",
  tarde_desde: "14:00",
  tarde_hasta: "21:00",
};

// Los extremos de una franja, ya en formato "HH:MM" para comparar con la
// grilla. De Postgres las horas llegan como "HH:MM:SS".
export function franjaDe(franja: Franja, horario: HorarioTO = HORARIO_POR_OMISION) {
  return franja === "manana"
    ? { etiqueta: "Mañana", desde: aHHMM(horario.manana_desde), hasta: aHHMM(horario.manana_hasta) }
    : { etiqueta: "Tarde", desde: aHHMM(horario.tarde_desde), hasta: aHHMM(horario.tarde_hasta) };
}

// Se conserva el nombre FRANJAS para las pantallas que sólo necesitan las dos
// etiquetas y un orden estable.
export const FRANJAS: Record<Franja, { etiqueta: string; desde: string; hasta: string }> = {
  manana: franjaDe("manana"),
  tarde: franjaDe("tarde"),
};

// La agenda se divide cada 5 minutos: es la unidad mínima con la que se
// reserva, y un turno puede empezar a las 8:05 o durar 25 minutos.
export const PASO_MINUTOS = 5;

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Los domingos no se atiende. El resto de los días sí, en las dos franjas:
// antes el sábado era un caso especial de sólo mañana, y dejó de serlo cuando
// el consultorio pasó a atender también los sábados a la tarde.
export function seAtiende(fechaIso: string) {
  return diaDeSemana(fechaIso) !== 0;
}

function aMinutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function aHora(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function horariosDe(franja: Franja, horario: HorarioTO = HORARIO_POR_OMISION): string[] {
  const { desde, hasta } = franjaDe(franja, horario);
  const horarios: string[] = [];
  for (let m = aMinutos(desde); m < aMinutos(hasta); m += PASO_MINUTOS) {
    horarios.push(aHora(m));
  }
  return horarios;
}

// ── Fechas ─────────────────────────────────────────────────────────────────

// La fecha de hoy sale de `fecha.ts`, que la calcula en la zona de Tucumán.
// Antes se tomaba del reloj del servidor, que en el hosting corre en UTC: a
// partir de las 21 la agenda abría directamente en el día siguiente.
export { hoyIso } from "@/lib/fecha";

// 0 = domingo, 1 = lunes ... 6 = sábado
export function diaDeSemana(fechaIso: string) {
  const [a, m, d] = fechaIso.split("-").map(Number);
  return new Date(a, m - 1, d).getDay();
}

export function sumarDias(fechaIso: string, dias: number) {
  const [a, m, d] = fechaIso.split("-").map(Number);
  const f = new Date(a, m - 1, d + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

// Lunes a sábado de la semana que contiene esa fecha.
export function semanaDe(fechaIso: string): string[] {
  const dia = diaDeSemana(fechaIso);
  // El domingo se toma como cierre de la semana anterior.
  const offsetLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = sumarDias(fechaIso, offsetLunes);
  return Array.from({ length: 6 }, (_, i) => sumarDias(lunes, i));
}

// Semanas completas que cubren el mes, para la vista mensual.
export function semanasDelMes(fechaIso: string): string[][] {
  const [a, m] = fechaIso.split("-").map(Number);
  const primero = `${a}-${String(m).padStart(2, "0")}-01`;
  const ultimoDia = new Date(a, m, 0).getDate();
  const ultimo = `${a}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  const semanas: string[][] = [];
  let cursor = semanaDe(primero)[0];
  while (cursor <= ultimo) {
    semanas.push(semanaDe(cursor));
    cursor = sumarDias(cursor, 7);
  }
  return semanas;
}

export function fechasDe(vista: Vista, fechaIso: string): string[] {
  if (vista === "dia") return [fechaIso];
  if (vista === "semana") return semanaDe(fechaIso);
  return semanasDelMes(fechaIso).flat();
}

export function formatoCorto(fechaIso: string) {
  const [, m, d] = fechaIso.split("-");
  return `${d}/${m}`;
}

export function formatoLargo(fechaIso: string) {
  const [a, m, d] = fechaIso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function nombreDelMes(fechaIso: string) {
  const [a, m] = fechaIso.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

// ── Ocupación ──────────────────────────────────────────────────────────────

export type Frecuencia = "unica" | "semanal";

// Un turno es la definición de una serie: primera fecha, hora y cada cuánto
// se repite. Las repeticiones no se guardan como filas, se calculan.
export type Turno = {
  id: string;
  fecha: string;
  hora: string;
  estado: string;
  modalidad: string;
  paciente: string;
  paciente_id: string;
  frecuencia: Frecuencia;
  fecha_fin: string | null;
  duracion_minutos: number;
  // Qué clase de turno es y cuánto se cobra. Opcionales: los turnos
  // cargados antes de la migración 0021 no los tienen.
  clase?: string;
  valor_sesion?: number | null;
};

// Una ocurrencia concreta: el turno tal como cae en una fecha puntual.
export type Ocurrencia = Turno & { fechaOcurrencia: string };

const DIAS_DE_SALTO: Record<Frecuencia, number> = {
  unica: 0,
  semanal: 7,
};

// Expande cada serie sobre el rango visible, salteando las fechas canceladas
// puntualmente.
export function ocurrenciasEn(
  turnos: Turno[],
  desde: string,
  hasta: string,
  excepciones: { turno_id: string; fecha: string }[] = []
): Ocurrencia[] {
  const canceladas = new Set(excepciones.map((e) => `${e.turno_id}|${e.fecha}`));
  const salida: Ocurrencia[] = [];

  for (const t of turnos) {
    if (t.estado === "cancelado") continue; // serie cancelada entera

    const salto = DIAS_DE_SALTO[t.frecuencia] ?? 0;
    const fin = t.fecha_fin && t.fecha_fin < hasta ? t.fecha_fin : hasta;

    if (salto === 0) {
      if (t.fecha >= desde && t.fecha <= hasta && !canceladas.has(`${t.id}|${t.fecha}`)) {
        salida.push({ ...t, fechaOcurrencia: t.fecha });
      }
      continue;
    }

    // Se arranca en la primera repetición que cae dentro del rango, para no
    // iterar desde la fecha original si la serie es vieja.
    let fecha = t.fecha;
    if (fecha < desde) {
      const dias = diasEntre(fecha, desde);
      fecha = sumarDias(fecha, Math.ceil(dias / salto) * salto);
    }
    while (fecha <= fin) {
      if (!canceladas.has(`${t.id}|${fecha}`)) {
        salida.push({ ...t, fechaOcurrencia: fecha });
      }
      fecha = sumarDias(fecha, salto);
    }
  }

  return salida;
}

function diasEntre(desde: string, hasta: string) {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  const ms = new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime();
  return Math.round(ms / 86400000);
}

// Los bloqueos también pueden repetirse: el caso de uso es el rato que la
// TO se reserva cada mes para escribir informes.
export type FrecuenciaBloqueo = "unica" | "semanal" | "mensual";

export type Bloqueo = {
  id: string;
  motivo: string;
  tipo: string;
  fecha_desde: string;
  fecha_hasta: string;
  hora_desde: string | null;
  hora_hasta: string | null;
  frecuencia?: FrecuenciaBloqueo;
};

// La hora viene de Postgres como "HH:MM:SS"; en la grilla se compara "HH:MM".
export function aHHMM(hora: string) {
  return hora.slice(0, 5);
}

export function turnoEn(ocurrencias: Ocurrencia[], fecha: string, hora: string) {
  return (
    ocurrencias.find((t) => t.fechaOcurrencia === fecha && aHHMM(t.hora) === hora) ?? null
  );
}

// ¿Ese día cae dentro del bloqueo? Para los que se repiten, `fecha_desde` y
// `fecha_hasta` marcan el período en que la repetición sigue vigente, y el
// día concreto lo define la frecuencia: el mismo día de la semana, o el mismo
// día del mes.
function diaAlcanzado(b: Bloqueo, fecha: string) {
  if (fecha < b.fecha_desde || fecha > b.fecha_hasta) return false;

  const frecuencia = b.frecuencia ?? "unica";
  if (frecuencia === "semanal") return diaDeSemana(fecha) === diaDeSemana(b.fecha_desde);
  if (frecuencia === "mensual") return fecha.slice(8) === b.fecha_desde.slice(8);
  return true; // única: todo el rango queda bloqueado
}

export function bloqueoEn(bloqueos: Bloqueo[], fecha: string, hora: string) {
  return (
    bloqueos.find((b) => {
      if (!diaAlcanzado(b, fecha)) return false;
      if (!b.hora_desde || !b.hora_hasta) return true; // día entero
      return hora >= aHHMM(b.hora_desde) && hora < aHHMM(b.hora_hasta);
    }) ?? null
  );
}

// Cuántas filas de la grilla ocupa un turno según su duración.
export function filasQueOcupa(duracionMinutos: number) {
  return Math.max(1, Math.round((duracionMinutos || PASO_MINUTOS) / PASO_MINUTOS));
}

// Índice de la grilla: para cada día, en qué fila empieza cada turno y qué
// filas quedan tapadas por uno que ya empezó más arriba.
export function mapaDeOcupacion(ocurrencias: Ocurrencia[], horarios: string[]) {
  // Varios turnos pueden caer en la misma casilla: si se superponen hay que
  // verlos a los dos, porque justamente eso es lo que hay que corregir.
  const inicio = new Map<string, Ocurrencia[]>();
  const tapada = new Set<string>();

  for (const t of ocurrencias) {
    const hora = aHHMM(t.hora);
    const desde = horarios.indexOf(hora);
    if (desde < 0) continue; // cae fuera de la franja que se está mirando

    const clave = `${t.fechaOcurrencia}|${hora}`;
    inicio.set(clave, [...(inicio.get(clave) ?? []), t]);

    const filas = filasQueOcupa(t.duracion_minutos);
    for (let i = 1; i < filas && desde + i < horarios.length; i++) {
      tapada.add(`${t.fechaOcurrencia}|${horarios[desde + i]}`);
    }
  }

  // Una casilla que además arranca un turno no puede darse por tapada: si dos
  // se pisan, el segundo debe seguir siendo visible.
  for (const clave of inicio.keys()) tapada.delete(clave);

  return { inicio, tapada };
}

// Primer día hábil desde una fecha: los domingos no se atiende, y abrir la
// agenda en un día vacío parece que no hubiera turnos cargados.
export function primerDiaHabil(fechaIso: string) {
  return diaDeSemana(fechaIso) === 0 ? sumarDias(fechaIso, 1) : fechaIso;
}

// Opciones del alta rápida de turnos desde la agenda. Van acá y no en el
// archivo de acciones porque un "use server" sólo puede exportar funciones.
export const CLASES_TURNO = [
  { valor: "sesion", label: "Sesión" },
  { valor: "evaluacion", label: "Evaluación" },
  { valor: "reunion", label: "Reunión" },
  { valor: "grupal", label: "Grupal" },
] as const;

export const DURACIONES = [
  { valor: 30, label: "30 minutos" },
  { valor: 40, label: "40 minutos" },
  { valor: 45, label: "45 minutos" },
  { valor: 60, label: "1 hora" },
  { valor: 90, label: "1 hora 30 minutos" },
] as const;

// Valor que toma el desplegable de pacientes cuando se elige "Otro". No es
// un identificador válido, así que no puede confundirse con un paciente real.
// Lo comparten el formulario y la acción: si cada uno usara su propio texto,
// el servidor recibiría "otro" como si fuera un id y el alta fallaría.
export const PACIENTE_OTRO = "__otro__";
