import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CookieBanner } from "@/components/CookieBanner";
import { SECCIONES, seccionPorSlug, fotosDe, portadaDe } from "@/lib/galeria";

export function generateStaticParams() {
  return SECCIONES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const actividad = seccionPorSlug(slug);
  return {
    title: actividad ? `${actividad.titulo} — Ñandubay` : "Galería — Ñandubay",
  };
}

export default async function GaleriaActividad({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const actividad = seccionPorSlug(slug);
  if (!actividad) notFound();

  const fotos = fotosDe(actividad);

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-blue-light/10">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <Link
            href={actividad.enGaleria ? "/#galeria" : "/"}
            className="text-sm text-blue-mid hover:underline"
          >
            {actividad.enGaleria ? "← Volver a la galería" : "← Volver al inicio"}
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold text-green-dark">
            {actividad.titulo}
          </h1>

          <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <Image
              src={portadaDe(actividad)}
              alt={actividad.titulo}
              width={1200}
              height={1200}
              className="w-full object-contain"
              priority
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((foto, i) => (
              <div key={foto} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <Image
                  src={foto}
                  alt={`${actividad.titulo} — foto ${i + 1}`}
                  width={800}
                  height={800}
                  className="aspect-square w-full object-cover"
                />
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/#contacto" className="text-sm font-bold text-blue-mid hover:underline">
              {actividad.enGaleria
                ? "¿Querés participar de la próxima? Escribinos →"
                : "¿Tenés dudas? Escribinos →"}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}
