import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SECCIONES_NINOS, SECCIONES_ADULTOS, type DatosFicha } from "@/lib/ficha-fields";
import { Card } from "@/components/ui/Card";
import { calcularDatosFaltantes } from "@/lib/datos-faltantes";
import { SECCIONES_PACIENTE } from "@/lib/paciente-vista";
import { BotonEnvio } from "@/components/ui/BotonEnvio";
import { actualizarDatosPaciente } from "@/app/panel/admin/pacientes/actions";

// Portada del paciente: sus datos y el acceso a cada parte de la historia.
export default async function PortadaPaciente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireRole("to", "admin", "direccion");
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, numero_registro, tipo, fecha_nacimiento, dni, tos(nombre)")
    .eq("id", id)
    .maybeSingle();

  if (!paciente) return <p className="text-sm text-foreground/60">Paciente no encontrado.</p>;

  const [{ data: ficha }, { data: acuerdo }, { data: evolucion }] = await Promise.all([
    supabase.from("fichas_inicio").select("id, datos").eq("paciente_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("acuerdos_terapeuticos").select("id").eq("paciente_id", id).limit(1).maybeSingle(),
    supabase.from("notas_evolucion").select("fecha").eq("paciente_id", id).order("fecha", { ascending: false }),
  ]);

  const secciones = paciente.tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  const datosFaltantes = calcularDatosFaltantes({
    paciente,
    datosFicha: (ficha?.datos ?? {}) as DatosFicha,
    tieneFicha: !!ficha,
    tieneAcuerdo: !!acuerdo,
    secciones,
    ultimaEvolucion: evolucion?.[0]?.fecha ?? null,
  });

  const base = `/panel/${usuario.rol}/pacientes/${id}`;
  const dato = (etiqueta: string, valor: string | null | undefined) =>
    valor ? (
      <div>
        <dt className="text-xs font-semibold uppercase text-foreground/50">{etiqueta}</dt>
        <dd className="text-sm font-semibold text-green-dark">{valor}</dd>
      </div>
    ) : null;

  return (
    <div>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-green-dark">Datos personales</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dato("Apellido y nombre", paciente.nombre)}
          {dato("Nº de registro", paciente.numero_registro)}
          {dato("DNI", paciente.dni)}
          {dato("Fecha de nacimiento", paciente.fecha_nacimiento)}
          {dato("Tipo de ficha", paciente.tipo)}
          {/* @ts-expect-error relación anidada */}
          {dato("TO a cargo", paciente.tos?.nombre)}
        </dl>

        {/* Corregir lo que se cargó mal en el alta. Sólo el admin: para la TO
            estos datos siguen siendo de lectura. El número de registro no
            entra, porque identifica la historia clínica. */}
        {usuario.rol === "admin" && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-blue-mid">
              Corregir datos personales
            </summary>
            <form action={actualizarDatosPaciente} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="paciente_id" value={id} />
              <label className="text-xs font-semibold text-foreground/70">
                Apellido y nombre
                <input
                  required
                  name="nombre"
                  defaultValue={paciente.nombre}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
              </label>
              <label className="text-xs font-semibold text-foreground/70">
                DNI
                <input
                  name="dni"
                  defaultValue={paciente.dni ?? ""}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
              </label>
              <label className="text-xs font-semibold text-foreground/70">
                Fecha de nacimiento
                <input
                  type="date"
                  name="fecha_nacimiento"
                  defaultValue={paciente.fecha_nacimiento ?? ""}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
              </label>
              <label className="text-xs font-semibold text-foreground/70">
                Tipo de ficha
                <select
                  name="tipo"
                  defaultValue={paciente.tipo}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                >
                  <option value="nino">Niño</option>
                  <option value="adulto">Adulto</option>
                </select>
              </label>
              <p className="text-xs text-foreground/60 sm:col-span-2">
                El Nº de registro no se modifica: identifica la historia
                clínica. Cambiar el tipo de ficha cambia qué campos se muestran
                en la ficha de inicio; lo ya cargado no se borra.
              </p>
              <BotonEnvio variant="secondary" className="justify-self-start sm:col-span-2">
                Guardar datos personales
              </BotonEnvio>
            </form>
          </details>
        )}
      </section>

      {datosFaltantes.length > 0 && (
        <Card className="mt-4 border-yellow-main/50 bg-yellow-soft/20">
          <p className="font-bold text-[#8a6400]">
            Datos pendientes de completar ({datosFaltantes.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {datosFaltantes.map((f) => (
              <span key={f} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#8a6400] shadow-sm">
                {f}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-foreground/60">
            Se pueden ir completando en las próximas consultas.
          </p>
        </Card>
      )}

      <h2 className="mt-8 font-bold text-green-dark">Historia clínica</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECCIONES_PACIENTE.filter((s) => s.slug).map((s) => (
          <Link
            key={s.slug}
            href={`${base}/${s.slug}`}
            className="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-2xl">{s.icono}</p>
            <p className="mt-2 font-extrabold text-green-dark">{s.titulo}</p>
            <p className="mt-1 text-sm text-foreground/60">{s.descripcion}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 font-bold text-green-dark">Imprimir</h2>
      <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
        {[
          { href: `/api/imprimir/ficha?paciente_id=${id}`, label: "Ficha de inicio" },
          { href: `/api/imprimir/acuerdo?paciente_id=${id}`, label: "Acuerdo terapéutico" },
          { href: `/api/imprimir/evolucion?paciente_id=${id}`, label: "Evolución" },
          { href: `/api/backup?paciente_id=${id}`, label: "Historia clínica completa" },
        ].map((b) => (
          <a
            key={b.href}
            href={b.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-black/10 px-4 py-2 text-blue-mid hover:bg-blue-light/20"
          >
            {b.label}
          </a>
        ))}
      </div>
    </div>
  );
}
