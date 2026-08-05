import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SECCIONES_PACIENTE } from "@/lib/paciente-vista";

// Encabezado y menú comunes a las cinco secciones del paciente. Antes todo
// vivía en una sola página larguísima; separarlo evita tener que recorrerla
// entera para llegar a la evolución o a los turnos.
export default async function LayoutPaciente({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireRole("to", "admin", "direccion");
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, numero_registro, tipo, activo")
    .eq("id", id)
    .maybeSingle();

  if (!paciente) {
    return <p className="text-sm text-foreground/60">Paciente no encontrado.</p>;
  }

  const base = `/panel/${usuario.rol}/pacientes/${id}`;

  return (
    <div>
      <Link
        href={`/panel/${usuario.rol}/pacientes`}
        className="text-sm text-blue-mid hover:underline"
      >
        ← Volver a pacientes
      </Link>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-extrabold text-green-dark">{paciente.nombre}</h1>
        <span className="rounded-full bg-green-light/40 px-3 py-1 text-sm font-bold text-green-dark">
          Nº {paciente.numero_registro}
        </span>
        <span className="text-sm capitalize text-foreground/60">{paciente.tipo}</span>
        {paciente.activo === false && (
          <span className="rounded-full bg-orange/15 px-3 py-1 text-xs font-bold text-orange">
            Dado de baja
          </span>
        )}
      </div>

      {/* Menú de secciones */}
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-black/10 pb-px">
        {SECCIONES_PACIENTE.map((s) => (
          <Link
            key={s.slug}
            href={s.slug ? `${base}/${s.slug}` : base}
            className="whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-semibold text-foreground/70 hover:bg-green-light/20 hover:text-green-dark"
          >
            <span className="mr-1">{s.icono}</span>
            {s.titulo}
          </Link>
        ))}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
