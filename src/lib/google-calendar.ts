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

type TurnoEvento = {
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  duracionMinutos: number;
  pacienteNombre: string;
  modalidad: "presencial" | "online";
  toNombre: string;
};

export async function crearEventoCalendar(turno: TurnoEvento): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  const inicio = new Date(`${turno.fecha}T${turno.hora}`);
  const fin = new Date(inicio.getTime() + turno.duracionMinutos * 60000);

  const { data } = await calendar.events.insert({
    calendarId: CALENDAR_ID!,
    requestBody: {
      summary: `${turno.pacienteNombre} — ${turno.toNombre}`,
      description: `Turno ${turno.modalidad} — Ñandubay`,
      start: { dateTime: inicio.toISOString(), timeZone: "America/Argentina/Tucuman" },
      end: { dateTime: fin.toISOString(), timeZone: "America/Argentina/Tucuman" },
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
