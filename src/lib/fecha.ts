// Toda fecha y hora del sistema se interpreta en la zona de Tucumán.
//
// El servidor de Hostinger corre en UTC, tres horas adelante. Sin esto, a
// partir de las 21 el sistema ya creía que era el día siguiente: la agenda
// abría en mañana, el botón "Hoy" llevaba al día equivocado y el tablero
// mostraba los turnos de otra jornada. La auditoría, además, anotaba cada
// acción con tres horas de más.
//
// No alcanza con configurar la zona horaria del servidor: si mañana el
// sistema se muda a otro hosting, el error vuelve sin que nadie lo note. Por
// eso la zona se fija acá, en el código.
export const ZONA = "America/Argentina/Tucuman";

// La fecha de hoy en Tucumán, como "AAAA-MM-DD", que es el formato con el que
// trabaja todo el sistema. El locale "en-CA" es el que da justamente ese
// formato, por eso se usa acá aunque los textos vayan en español.
export function hoyIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Fecha y hora para mostrar en pantalla, ej. "15/10/2026, 17:02:20".
//
// El reloj se fuerza a 24 horas. Dejándolo librado al locale, según la versión
// de Node que tenga el servidor, "es-AR" formatea en 12 horas y además sin
// a. m. ni p. m.: las 17:07 se mostraban como "05:07:20", imposible de
// distinguir de las cinco de la mañana. En una auditoría clínica, que tiene
// que poder decir cuándo pasó cada cosa, eso no sirve.
export function fechaHoraLegible(cuando: string | Date): string {
  return new Date(cuando).toLocaleString("es-AR", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Sólo la fecha, ej. "15/10/2026".
export function fechaLegible(cuando: string | Date): string {
  return new Date(cuando).toLocaleDateString("es-AR", { timeZone: ZONA });
}
