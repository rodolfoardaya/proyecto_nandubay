import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Política de cookies — Ñandubay" };

export default function PoliticaCookies() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 prose prose-headings:text-green-dark">
          <h1 className="text-3xl font-extrabold text-green-dark">
            Uso de cookies
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">
            Ñandubay les informa a los usuarios del sitio cuando ocurre el
            uso de cookies (un paquete de datos que el navegador almacena de
            forma automática en el dispositivo del usuario al visitar una
            página web, que permite reconocer el dispositivo y recordar
            preferencias) mediante un banner que aparece en la parte inferior
            del sitio. Al continuar navegando el sitio, se entiende que
            autorizás el uso de dichas cookies, aunque podés modificar tu
            elección en cualquier momento.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">
            Podés aceptar o rechazar el uso de cookies. En caso de
            rechazarlas, es posible que no puedas beneficiarte de todas las
            funcionalidades del sitio. También podés rechazarlas desde la
            configuración de tu navegador; para que el rechazo tenga efecto
            permanente, el navegador debe permitir el uso de cookies.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">
            El sitio puede utilizar plugins de redes sociales (por ejemplo,
            Instagram o Facebook). Si tenés una sesión iniciada en esas redes
            mientras navegás nuestro sitio, la red social podrá asociar tu
            visita a tu perfil. Si no querés esto, cerrá sesión en la red
            social antes de visitar nuestro sitio, o bloqueá los plugins
            desde tu navegador.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
