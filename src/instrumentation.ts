// Cuando una Server Action llama a redirect(), Next.js resuelve el destino
// haciendo un fetch del servidor contra sí mismo. El origen de ese fetch sale
// de __NEXT_PRIVATE_ORIGIN, que Next arma con el hostname al que se ató el
// proceso. En hostings que lo levantan con -H 0.0.0.0 detrás de un proxy, ese
// origen queda inalcanzable desde adentro y el fetch muere con
// "TypeError: fetch failed" (visible en los logs como
// "failed to get redirect response"). Consecuencia: todo redirect() de Server
// Action queda a medias — entre ellos el del login.
//
// register() corre una vez al arrancar, después de que Next fijó la variable,
// así que es el único lugar donde se la puede apuntar al loopback.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Deja constancia de que corrió y de qué origen encontró, para poder
  // verificarlo desde /api/diagnostico en el server ya desplegado.
  const g = globalThis as Record<string, unknown>;
  g.__nandubay_origen_previo = process.env.__NEXT_PRIVATE_ORIGIN ?? "(sin definir)";
  g.__nandubay_register_ok = true;

  if (process.env.NODE_ENV !== "production") return;

  const puerto = process.env.PORT || "3000";
  process.env.__NEXT_PRIVATE_ORIGIN = `http://127.0.0.1:${puerto}`;
}
