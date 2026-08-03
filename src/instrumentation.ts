// Cuando una Server Action llama a redirect(), Next.js resuelve el destino
// haciendo un fetch del servidor contra sí mismo. El origen de ese fetch sale
// de __NEXT_PRIVATE_ORIGIN, que Next arma con el hostname al que se ató el
// proceso. Hostinger lo levanta con 0.0.0.0, que es una dirección para
// escuchar y no para conectarse: el fetch muere con "TypeError: fetch failed"
// (en los logs aparece como "failed to get redirect response") y deja a medias
// todo redirect() de Server Action, el del login incluido.
//
// El loopback tampoco sirve acá: el proceso que atiende la request no comparte
// red con el que escucha en :3000 (ECONNREFUSED). El único origen alcanzable
// desde adentro es el dominio público.
//
// register() corre una vez al arrancar, después de que Next fijó la variable,
// así que es el único lugar donde se la puede reapuntar.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  // Sólo se corrige el caso roto. Con `next start` normal el origen es
  // localhost, funciona, y acá no se toca nada.
  const origen = process.env.__NEXT_PRIVATE_ORIGIN ?? "";
  if (!origen.includes("0.0.0.0")) return;

  const publico = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (publico) process.env.__NEXT_PRIVATE_ORIGIN = publico;
}
