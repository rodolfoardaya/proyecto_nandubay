import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "#servicios", label: "Servicios" },
  { href: "#equipo", label: "Equipo" },
  { href: "#galeria", label: "Galería" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-green-dark text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/brand/logo.jpeg"
            alt="Ñandubay"
            width={40}
            height={40}
            className="rounded-full bg-white"
          />
          <span className="font-extrabold tracking-wide">Ñandubay</span>
        </Link>

        <ul className="hidden gap-6 text-sm font-semibold md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hover:text-yellow-soft">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="#contacto"
            className="rounded-full bg-yellow-main px-3 py-2 text-xs font-bold text-[#1c4d4f] hover:brightness-95 sm:px-4 sm:text-sm"
          >
            Solicitar turno
          </a>

          {/* Menú de teléfono. Va con <details> para no necesitar JavaScript:
              antes los links simplemente desaparecían en pantallas chicas y
              no había forma de navegar el sitio desde el celular. */}
          <details className="relative md:hidden">
            <summary
              className="flex cursor-pointer list-none items-center rounded-lg p-2 hover:bg-white/10"
              aria-label="Abrir menú"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </summary>
            <ul className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl bg-white py-1 text-sm font-semibold text-green-dark shadow-lg">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="block px-4 py-2.5 hover:bg-green-light/30">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </nav>
    </header>
  );
}
