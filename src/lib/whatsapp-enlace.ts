// Enlaces para abrir WhatsApp con un mensaje ya escrito.
//
// No se manda nada desde el servidor: el enlace abre el WhatsApp del
// consultorio con el contacto y el texto cargados, y la persona aprieta
// enviar. Así el mensaje sale del número de Ñandubay de verdad, se puede
// corregir antes, y no hace falta la API de Meta —que además obliga a usar
// plantillas aprobadas por ellos y cobra por conversación—.

// WhatsApp necesita el número en formato internacional, sólo dígitos.
//
// En Argentina un celular se escribe de muchas formas: 3815821197,
// 0381 15 582-1197, +54 9 381 582-1197. Todas tienen que terminar en
// 5493815821197, que es lo único que entiende el enlace.
export function telefonoWhatsapp(crudo: string | null | undefined): string | null {
  if (!crudo) return null;
  let d = crudo.replace(/\D/g, "");
  if (!d) return null;

  // El 0 de larga distancia, el 54 del país y el 9 de celular se sacan
  // siempre que estén adelante: ahí no hay ambigüedad posible.
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);

  // El 15 sólo se saca si al número le sobra largo. Buscarlo siempre era un
  // error: en 3815821197 hay un "15" en el medio —381-582-1197— y sacarlo
  // dejaba un número distinto. Un número mal armado le manda el turno de un
  // chico a un desconocido, así que acá se prefiere no tocar.
  if (d.length > 10) d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");

  // Un número argentino sin 0, sin 54, sin 9 y sin 15 tiene exactamente 10
  // dígitos: característica más abonado. Cualquier otra cosa se devuelve
  // como inválida, para que la pantalla avise en vez de inventar.
  if (d.length !== 10) return null;

  return `549${d}`;
}

// Cómo se ve el número en pantalla, para que se pueda controlar de un
// vistazo antes de abrir WhatsApp.
export function telefonoLegible(internacional: string) {
  const resto = internacional.replace(/^549/, "");
  return `+54 9 ${resto.slice(0, 3)} ${resto.slice(3)}`;
}

export function enlaceWhatsapp(telefonoInternacional: string, mensaje: string) {
  return `https://wa.me/${telefonoInternacional}?text=${encodeURIComponent(mensaje)}`;
}

// Los textos que se proponen. Son un punto de partida: en la pantalla se
// pueden editar antes de enviar.
// El texto es el que redactó el consultorio. Lo único que cambia es la hora:
// no lleva el nombre del paciente porque el mensaje va dirigido a la familia,
// que ya sabe de quién se trata.
export function mensajeTurno(p: { hora: string }) {
  return `🌿 ¡Hola, familia! ¿Cómo están?

Les recordamos que mañana tenemos nuestro encuentro en Ñandubay, a las ${p.hora}.

Si por algún motivo no pueden asistir, les pedimos que nos avisen con al menos 12 horas de anticipación, para poder reorganizar la agenda y ofrecer ese horario a otra familia.

Les recordamos que las cancelaciones realizadas fuera de ese plazo y las inasistencias sin aviso deberán abonarse, ya que el espacio queda reservado especialmente para ustedes. (Excepto razones de fuerza mayor)

¡Muchas gracias por su compromiso y por ayudarnos a cuidar este espacio que construimos juntos! ❤️

Ñandubay
Un espacio para florecer juntos. 🌱`;
}

export function mensajeTarea(p: { titulo: string; fecha: string; hora: string; detalle?: string | null }) {
  return (
    `Hola! Te recordamos: ${p.titulo}.\n` +
    `Vence el ${p.fecha} a las ${p.hora}.` +
    (p.detalle ? `\n\n${p.detalle}` : "") +
    `\n\nEspacio Ñandubay`
  );
}
