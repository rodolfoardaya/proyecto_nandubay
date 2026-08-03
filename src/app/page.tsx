import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CookieBanner } from "@/components/CookieBanner";
import { Faq } from "@/components/Faq";
import { ContactForm } from "@/components/ContactForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ACTIVIDADES, portadaDe } from "@/lib/galeria";

const servicios = [
  // Atención presencial
  { titulo: "Integración sensorial", modo: "Presencial" },
  { titulo: "Evaluaciones de Terapia Ocupacional", modo: "Presencial" },
  { titulo: "Intervención en infancias, adolescentes y adultos", modo: "Presencial" },
  { titulo: "Actividades de la vida diaria", modo: "Presencial" },
  { titulo: "Selectividad alimentaria", modo: "Presencial" },
  { titulo: "Rehabilitación cognitiva", modo: "Presencial + Online" },
  // Atención online
  { titulo: "Asesoramiento y orientación a familias", modo: "Online" },
  { titulo: "Estrategias para el hogar", modo: "Online" },
  { titulo: "Organización de rutinas y actividades", modo: "Online" },
];

// Las fotos son archivos estáticos en /public/equipo/. Van así y no desde el
// bucket de Storage porque esta página es pública y las URLs firmadas vencen.
const equipo = [
  {
    nombre: "Fundadora Lic. Romina Gabriela Ardaya",
    // El nombre va exacto como está el archivo: el servidor es Linux y
    // distingue mayúsculas de minúsculas.
    foto: "/equipo/ROMINA.jpeg",
    frase:
      "Creo profundamente en el potencial de cada niño, en sus tiempos, en su singularidad, y en el poder del vínculo como motor de transformación.",
  },
  {
    nombre: "Lic. Rocío Terzaghi Paz",
    foto: "/equipo/ROCIO.jpeg",
    frase:
      "Me gusta ser TO porque me gusta acompañar con pequeñas herramientas que hoy parecen simples, pero mañana construyen autonomía.",
  },
];

export default function Home() {
  // Deployed to Vercel - Production
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-yellow-soft/40">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-extrabold text-green-dark md:text-5xl">
                Un espacio para florecer juntos
              </h1>
              <p className="mt-4 text-lg text-foreground/80">
                Terapia Ocupacional para niños, jóvenes y adultos en San
                Miguel de Tucumán. Acompañamos con respeto, escucha y vínculo,
                integrando a la familia en cada proceso.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#contacto">
                  <Button variant="cta">Solicitar turno</Button>
                </a>
                <a href="#servicios">
                  <Button variant="secondary">Conocer servicios</Button>
                </a>
                <Link href="/galeria/obras-sociales">
                  <Button variant="secondary">Obras sociales</Button>
                </Link>
                <Link href="/galeria/recordatorio-para-las-familias">
                  <Button variant="secondary">Recordatorio para las familias</Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <Image
                src="/brand/logo.jpeg"
                alt="Ñandubay — Terapia Ocupacional Pediátrica"
                width={340}
                height={340}
                className="rounded-3xl"
                priority
              />
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="bg-green-light/25">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-3xl font-extrabold text-green-dark">
              Nuestros servicios
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {servicios.map((s) => (
                <Card key={s.titulo}>
                  <span className="inline-block rounded-full bg-orange/15 px-3 py-1 text-xs font-bold text-orange">
                    {s.modo}
                  </span>
                  <p className="mt-3 font-bold text-green-dark">{s.titulo}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Equipo */}
        <section id="equipo">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-3xl font-extrabold text-green-dark">
              Nuestras profesionales
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {equipo.map((p) => (
                <Card key={p.nombre}>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <Image
                      src={p.foto}
                      alt={`Foto de ${p.nombre}`}
                      width={128}
                      height={128}
                      className="h-32 w-32 shrink-0 rounded-full object-cover object-top ring-4 ring-green-light/50"
                    />
                    <div>
                      <p className="text-lg font-extrabold text-green-dark">
                        {p.nombre}
                      </p>
                      <p className="mt-2 text-sm italic text-foreground/80">
                        &ldquo;{p.frase}&rdquo;
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/login">
                <Button variant="secondary">Acceso del personal</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Galería */}
        <section id="galeria" className="bg-blue-light/15">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-3xl font-extrabold text-green-dark">
              Galería de actividades
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-foreground/70">
              Momentos de nuestros talleres y encuentros. Entrá a cada
              actividad para ver todas las fotos.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {ACTIVIDADES.map((actividad) => (
                <Link
                  key={actividad.slug}
                  href={`/galeria/${actividad.slug}`}
                  className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <Image
                    src={portadaDe(actividad)}
                    alt={actividad.titulo}
                    width={800}
                    height={800}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="p-4">
                    <p className="font-extrabold text-green-dark">{actividad.titulo}</p>
                    <p className="mt-1 text-sm text-blue-mid group-hover:underline">
                      Ver las {actividad.cantidadFotos} fotos →
                    </p>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        </section>

        {/* FAQ */}
        <section id="faq">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-3xl font-extrabold text-green-dark">
              Preguntas frecuentes
            </h2>
            <div className="mt-10">
              <Faq />
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section id="contacto" className="bg-yellow-soft/30">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-center text-3xl font-extrabold text-green-dark">
              Contactanos
            </h2>
            <p className="mt-2 text-center text-sm text-foreground/70">
              Bolívar 551, planta baja — San Miguel de Tucumán · 3815821197 ·
              espacionandubay@gmail.com
            </p>
            <div className="mt-10">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}
