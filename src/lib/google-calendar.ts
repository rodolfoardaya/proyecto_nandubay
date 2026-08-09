import { createPrivateKey } from "node:crypto";
import { google } from "googleapis";

// Sincroniza turnos con el Google Calendar de espacionandubay@gmail.com.
// Requiere una cuenta de servicio de Google Cloud con el calendario
// compartido ("Hacer cambios en los eventos"). Si las credenciales no están
// configuradas todavía, las funciones no hacen nada (no rompen el alta de
// turnos mientras se termina de configurar del lado de Supabase/Google).

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// La clave privada llega distinta según de dónde se cargue: en `.env.local`
// el archivo saca las comillas solas, pero el panel del hosting guarda el
// valor tal cual se pega, comillas incluidas. Con la comilla adelante,
// OpenSSL no encuentra el encabezado y falla con "no start line".
function armarPem(cuerpo: string, tipo: string) {
  const lineas = cuerpo.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${tipo}-----\n${lineas.join("\n")}\n-----END ${tipo}-----\n`;
}

// Cada panel guarda la clave de una forma distinta, y algunas la rompen:
// unos dejan las comillas, otros se comen los saltos de línea, y otros la
// tratan como una URL y convierten los "+" del base64 en espacios.
//
// En vez de adivinar cuál fue, se arman todas las variantes posibles y se
// prueba cada una con el propio Node: la que logra construir una clave
// válida es la buena.
function normalizarClave(bruta: string) {
  let k = bruta.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  k = k.replace(/\\n/g, "\n").trim();

  const tipo = /BEGIN RSA PRIVATE KEY/.test(k) ? "RSA PRIVATE KEY" : "PRIVATE KEY";
  const crudo = k
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "")
    .replace(/-----END [A-Z ]*PRIVATE KEY-----/, "");

  // El base64 sólo usa letras, números, "+", "/" y "=". Cualquier otra cosa
  // que haya metido el panel —saltos, barras invertidas de un escape doble,
  // comillas— sobra y se descarta.
  const soloBase64 = (s: string) => s.replace(/[^A-Za-z0-9+/=]/g, "");

  const candidatas = [
    // 1. Tal cual vino, si ya era un PEM bien formado.
    k,
    // 2. Reconstruido con el contenido limpio.
    armarPem(soloBase64(crudo), tipo),
    // 3. Igual, pero devolviendo antes los "+" que algún panel convierte en
    //    espacios al tratar el valor como una URL.
    armarPem(soloBase64(crudo.replace(/[ \t]/g, "+")), tipo),
  ];

  for (const c of candidatas) {
    try {
      createPrivateKey(c);
      return c;
    } catch {
      // Se prueba la siguiente.
    }
  }

  // Ninguna sirvió: se informa la forma sin exponer la clave.
  const cuerpo = crudo.replace(/\s+/g, "");
  console.error(
    "[calendar] la clave privada no se pudo interpretar de ninguna forma. " +
      `Largo original ${bruta.length}, cuerpo ${cuerpo.length} caracteres ` +
      `(múltiplo de 4: ${cuerpo.length % 4 === 0}), ` +
      `espacios ${(crudo.match(/[ \t]/g) ?? []).length}, ` +
      `signos + ${(cuerpo.match(/\+/g) ?? []).length}, ` +
      `barras ${(cuerpo.match(/\//g) ?? []).length}.`
  );
  return candidatas[1];
}

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key || !CALENDAR_ID) {
    console.warn(
      "[calendar] sin sincronizar: faltan GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY o GOOGLE_CALENDAR_ID en este servidor."
    );
    return null;
  }

  const clave = normalizarClave(key);
  if (!clave.startsWith("-----BEGIN")) {
    console.error(
      "[calendar] GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no arranca con -----BEGIN. " +
        `Empieza con: ${JSON.stringify(clave.slice(0, 20))}`
    );
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: clave,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    return google.calendar({ version: "v3", auth });
  } catch (e) {
    // Una clave mal pegada (sin los \n, o cortada) rompe acá. Antes eso
    // tiraba abajo el alta del turno entero; ahora sólo se pierde la
    // sincronización, que es lo secundario.
    console.error(
      "[calendar] la clave privada no se pudo leer — revisar GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:",
      (e as Error).message
    );
    return null;
  }
}

// Ninguna falla de Google puede impedir guardar un turno: la agenda del
// sistema es la fuente, el calendario es un reflejo.
async function sinRomper<T>(que: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    const err = e as Error & { errors?: { message?: string }[] };
    console.error(`[calendar] ${que} falló:`, err.errors?.[0]?.message ?? err.message);
    return null;
  }
}

const ZONA = "America/Argentina/Tucuman";

type TurnoEvento = {
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  duracionMinutos: number;
  pacienteNombre: string;
  modalidad: "presencial" | "online";
  toNombre: string;
  frecuencia?: "unica" | "semanal";
  hasta?: string | null; // AAAA-MM-DD, tope de la serie
};

// Suma minutos a "HH:MM" sin pasar por Date: convertir a Date usa la zona
// horaria del servidor, que en el hosting no es la nuestra, y el turno
// terminaba corrido tres horas.
function sumarMinutos(hora: string, minutos: number) {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function crearEventoCalendar(turno: TurnoEvento): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  const horaFin = sumarMinutos(turno.hora, turno.duracionMinutos);

  // Los turnos que se repiten se cargan como evento recurrente, no como una
  // copia por semana: así mover o borrar la serie es una sola operación.
  const recurrencia =
    turno.frecuencia === "semanal"
      ? [
          "RRULE:FREQ=WEEKLY" +
            // El tope viaja como UNTIL para que Google deje de repetirlo el
            // mismo día que la agenda del sistema.
            (turno.hasta ? ";UNTIL=" + turno.hasta.replace(/-/g, "") + "T235959Z" : ""),
        ]
      : undefined;

  const data = await sinRomper("crear el evento", () =>
    calendar.events
      .insert({
        calendarId: CALENDAR_ID!,
        requestBody: {
          summary: `${turno.pacienteNombre} — ${turno.toNombre}`,
          description: `Turno ${turno.modalidad} — Ñandubay`,
          // La hora va como texto local con su zona: sin convertir a UTC, no
          // depende de dónde esté corriendo el servidor.
          start: { dateTime: `${turno.fecha}T${turno.hora}:00`, timeZone: ZONA },
          end: { dateTime: `${turno.fecha}T${horaFin}:00`, timeZone: ZONA },
          recurrence: recurrencia,
        },
      })
      .then((r) => r.data)
  );

  return data?.id ?? null;
}

export async function eliminarEventoCalendar(googleEventId: string) {
  const calendar = getCalendarClient();
  if (!calendar) return;

  await calendar.events.delete({
    calendarId: CALENDAR_ID!,
    eventId: googleEventId,
  }).catch(() => {
    // El evento puede haber sido borrado manualmente en Google Calendar;
    // no debe romper el flujo de la app.
  });
}

// Actualiza el evento cuando se edita el turno. Si no existía (por ejemplo,
// se cargó antes de configurar Google), se crea uno nuevo.
export async function actualizarEventoCalendar(
  googleEventId: string | null,
  turno: TurnoEvento
): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return googleEventId;
  if (!googleEventId) return crearEventoCalendar(turno);

  const horaFin = sumarMinutos(turno.hora, turno.duracionMinutos);
  const recurrencia =
    turno.frecuencia === "semanal"
      ? ["RRULE:FREQ=WEEKLY" + (turno.hasta ? ";UNTIL=" + turno.hasta.replace(/-/g, "") + "T235959Z" : "")]
      : undefined;

  try {
    await calendar.events.update({
      calendarId: CALENDAR_ID!,
      eventId: googleEventId,
      requestBody: {
        summary: `${turno.pacienteNombre} — ${turno.toNombre}`,
        description: `Turno ${turno.modalidad} — Ñandubay`,
        start: { dateTime: `${turno.fecha}T${turno.hora}:00`, timeZone: ZONA },
        end: { dateTime: `${turno.fecha}T${horaFin}:00`, timeZone: ZONA },
        recurrence: recurrencia ?? [],
      },
    });
    return googleEventId;
  } catch {
    // El evento pudo borrarse a mano en Google: se crea de nuevo en vez de
    // dejar el turno sin reflejo en el calendario.
    return crearEventoCalendar(turno);
  }
}
