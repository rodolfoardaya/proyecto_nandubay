import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getUsuarioActual } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

const NAV: Record<string, { href: string; label: string }[]> = {
  to: [
    { href: "/panel/to", label: "Agenda" },
    { href: "/panel/to/pacientes", label: "Pacientes" },
    { href: "/panel/to/facturacion", label: "Facturación" },
    { href: "/panel/to/backups", label: "Backups" },
    { href: "/panel/to/biblioteca", label: "Biblioteca" },
    { href: "/panel/to/reportes", label: "Reportes" },
  ],
  admin: [
    { href: "/panel/admin", label: "Agenda" },
    { href: "/panel/admin/pacientes", label: "Pacientes" },
    { href: "/panel/admin/facturacion", label: "Facturación" },
    { href: "/panel/admin/backups", label: "Backups" },
    { href: "/panel/admin/biblioteca", label: "Biblioteca" },
    { href: "/panel/admin/reportes", label: "Reportes" },
    { href: "/panel/admin/equipo", label: "Equipo TO" },
    { href: "/panel/admin/auditoria", label: "Auditoría" },
  ],
  direccion: [
    { href: "/panel/direccion", label: "Agenda" },
    { href: "/panel/direccion/pacientes", label: "Pacientes" },
    { href: "/panel/direccion/auditoria", label: "Auditoría" },
  ],
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");

  const links = NAV[usuario.rol];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-green-dark text-white">
        <Link
          href={`/panel/${usuario.rol}`}
          className="flex items-center gap-2 px-5 py-5 hover:bg-white/10"
        >
          <Image
            src="/brand/logo.jpeg"
            alt="Ñandubay"
            width={36}
            height={36}
            className="rounded-full bg-white"
          />
          <span className="font-extrabold">Ñandubay</span>
        </Link>
        <nav className="flex-1 px-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <p className="font-semibold">{usuario.nombre}</p>
          <p className="text-white/60 capitalize">{usuario.rol}</p>
          <Link href="/" className="mt-2 block text-xs underline text-white/70">
            ← Volver al sitio
          </Link>
          <form action={signOut}>
            <button className="mt-2 text-xs underline text-white/70">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-background p-8">{children}</main>
    </div>
  );
}
