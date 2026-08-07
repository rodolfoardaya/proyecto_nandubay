import { google } from "googleapis";

// Sincroniza turnos con el Google Calendar de espacionandubay@gmail.com.
// Requiere una cuenta de servicio de Google Cloud con el calendario
// compartido ("Hacer cambios en los eventos"). Si las credenciales no están
// configuradas todavía, las funciones no hacen nada (no rompen el alta de
// turnos mientras se termina de configurar del lado de Supabase/Google).

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key || !CALENDAR_ID) return null;

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
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

  const { data } = await calendar.events.insert({
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
  });

  return data.id ?? null;
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
        recurrence: recurrencia ?? null,
      },
    });
    return googleEventId;
  } catch {
    // El evento pudo borrarse a mano en Google: se crea de nuevo en vez de
    // dejar el turno sin reflejo en el calendario.
    return crearEventoCalendar(turno);
  }
}
