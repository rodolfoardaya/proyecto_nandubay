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

const equipo = [
  {
    nombre: "Fundadora Lic. Romina Gabriela Ardaya",
    frase:
      "Creo profundamente en el potencial de cada niño, en sus tiempos, en su singularidad, y en el poder del vínculo como motor de transformación.",
  },
  {
    nombre: "Lic. Rocío Terzaghi Paz",
    frase:
      "Me gusta ser TO porque me gusta acompañar con pequeñas herramientas que hoy parecen simples, pero mañana construyen autonomía.",
  },
];

export default function Home() {
  // Deployed to Vercel
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
                  <p className="text-lg font-extrabold text-green-dark">
                    {p.nombre}
                  </p>
                  <p className="mt-2 text-sm italic text-foreground/80">
                    &ldquo;{p.frase}&rdquo;
                  </p>
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
              Fotos y videos generales de nuestras actividades. Próximamente
              vas a poder ver más contenido acá.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-green-light/40"
                />
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
