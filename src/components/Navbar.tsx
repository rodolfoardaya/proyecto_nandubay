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
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
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
        <a
          href="#contacto"
          className="rounded-full bg-yellow-main px-4 py-2 text-sm font-bold text-[#1c4d4f] hover:brightness-95"
        >
          Solicitar turno
        </a>
      </nav>
    </header>
  );
}
