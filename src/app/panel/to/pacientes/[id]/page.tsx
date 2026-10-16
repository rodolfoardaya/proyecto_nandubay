import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SECCIONES_NINOS, SECCIONES_ADULTOS, type DatosFicha } from "@/lib/ficha-fields";
import { Card } from "@/components/ui/Card";
import { calcularDatosFaltantes } from "@/lib/datos-faltantes";
import { SECCIONES_PACIENTE } from "@/lib/paciente-vista";
import { BotonEnvio } from "@/components/ui/BotonEnvio";
import { actualizarDatosPaciente } from "@/app/panel/admin/pacientes/actions";
import {
  actualizarDatosAdministrativos,
  cambiarEstadoPaciente,
} from "@/app/panel/to/pacientes/actions";
import { ESTADOS_PACIENTE } from "@/lib/paciente-datos";

const ESTADO_COLOR: Record<string, string> = {
  activo: "bg-green-light/50 text-green-dark",
  en_evaluacion: "bg-blue-light/30 text-blue-mid",
  alta: "bg-yellow-main/30 text-[#8a6400]",
  baja: "bg-black/10 text-foreground/60",
};
import { documentoVisible, edadDe } from "@/lib/paciente-datos";

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
    .select(
      "id, nombre, numero_registro, tipo, fecha_nacimiento, dni, cuil, obra_social, estado, baja_motivo, tutor_nombre, tutor_dni, tutor_telefono, tutor_email, tos(nombre)"
    )
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

  // La edad no se carga: sale de la fecha de nacimiento y del día de hoy, y
  // por eso no aparece hasta que la fecha esté cargada.
  const edad = edadDe(paciente.fecha_nacimiento);

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
          {dato("CUIL", documentoVisible(paciente.cuil, paciente.dni))}
          {dato("Fecha de nacimiento", paciente.fecha_nacimiento)}
          {dato("Edad", edad?.texto)}
          {dato("Obra social", paciente.obra_social)}
          {dato("Tipo de ficha", paciente.tipo)}
          {/* @ts-expect-error relación anidada */}
          {dato("TO a cargo", paciente.tos?.nombre)}
          {dato("Tutor", paciente.tutor_nombre)}
          {dato("DNI del tutor", paciente.tutor_dni)}
          {dato("Teléfono / WhatsApp", paciente.tutor_telefono)}
          {dato("Correo", paciente.tutor_email)}
        </dl>

        {/* Estado del tratamiento. Dar de baja no borra nada: saca al
            paciente de los listados y su historia clínica queda intacta. */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
          <span className="text-xs font-semibold uppercase text-foreground/50">Estado</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              ESTADO_COLOR[paciente.estado ?? "activo"] ?? ESTADO_COLOR.activo
            }`}
          >
            {ESTADOS_PACIENTE.find((e) => e.valor === (paciente.estado ?? "activo"))?.label}
          </span>
          {paciente.estado === "baja" && paciente.baja_motivo && (
            <span className="text-xs italic text-foreground/60">{paciente.baja_motivo}</span>
          )}

          <details className="ml-auto">
            <summary className="cursor-pointer rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-blue-mid hover:bg-blue-light/20">
              Cambiar estado
            </summary>
            <form action={cambiarEstadoPaciente} className="mt-3 grid max-w-sm gap-2">
              <input type="hidden" name="paciente_id" value={id} />
              <select
                name="estado"
                defaultValue={paciente.estado ?? "activo"}
                className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
              >
                {ESTADOS_PACIENTE.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.label} — {e.ayuda}
                  </option>
                ))}
              </select>
              <input
                name="baja_motivo"
                defaultValue={paciente.baja_motivo ?? ""}
                placeholder="Motivo (sólo si es baja)"
                className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
              />
              <BotonEnvio variant="secondary" className="justify-self-start">
                Guardar estado
              </BotonEnvio>
            </form>
          </details>
        </div>

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
                CUIL
                <input
                  name="cuil"
                  defaultValue={paciente.cuil ?? ""}
                  placeholder="XX-XXXXXXXX-X"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
                {/* Los cargados antes de que existiera el campo tienen el DNI
                    suelto: se muestra para poder completar el CUIL sin ir a
                    buscar el documento. */}
                {!paciente.cuil && paciente.dni && (
                  <span className="mt-1 block font-normal text-foreground/60">
                    DNI cargado: {paciente.dni}
                  </span>
                )}
              </label>
              <label className="text-xs font-semibold text-foreground/70">
                Obra social
                <input
                  name="obra_social"
                  defaultValue={paciente.obra_social ?? ""}
                  placeholder="Obra social o prepaga"
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
                clínica. La edad tampoco se carga, se calcula sola a partir de
                la fecha de nacimiento. Cambiar el tipo de ficha cambia qué
                campos se muestran en la ficha de inicio; lo ya cargado no se
                borra.
              </p>
              <BotonEnvio variant="secondary" className="justify-self-start sm:col-span-2">
                Guardar datos personales
              </BotonEnvio>
            </form>
          </details>
        )}

        {/* La TO carga y corrige el CUIL y la obra social de sus pacientes: son
            los datos que pide en la primera sesión y los que hacen falta para
            facturar. El resto sigue siendo del admin. */}
        {usuario.rol === "to" && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-blue-mid">
              Cargar o corregir CUIL, obra social y datos del tutor
            </summary>
            <form action={actualizarDatosAdministrativos} className="mt-3 grid max-w-sm gap-2">
              <input type="hidden" name="paciente_id" value={id} />

              {/* Datos de quien acompaña al paciente: a quién se llama, a
                  quién se le factura y quién firma. */}
              {[
                { name: "tutor_nombre", label: "Tutor (apellido y nombre)", valor: paciente.tutor_nombre, tipo: "text", ph: "APELLIDO Y NOMBRE" },
                { name: "tutor_dni", label: "DNI del tutor", valor: paciente.tutor_dni, tipo: "text", ph: "Solo números" },
                { name: "tutor_telefono", label: "Teléfono / WhatsApp", valor: paciente.tutor_telefono, tipo: "tel", ph: "3815821197" },
                { name: "tutor_email", label: "Correo", valor: paciente.tutor_email, tipo: "email", ph: "correo@ejemplo.com" },
              ].map((c) => (
                <label key={c.name} className="text-xs font-semibold text-foreground/70">
                  {c.label}
                  <input
                    name={c.name}
                    type={c.tipo}
                    defaultValue={c.valor ?? ""}
                    placeholder={c.ph}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                  />
                </label>
              ))}
              <label className="text-xs font-semibold text-foreground/70">
                CUIL
                <input
                  name="cuil"
                  defaultValue={paciente.cuil ?? ""}
                  placeholder="XX-XXXXXXXX-X"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
                {!paciente.cuil && paciente.dni && (
                  <span className="mt-1 block font-normal text-foreground/60">
                    DNI cargado: {paciente.dni}
                  </span>
                )}
              </label>
              <label className="text-xs font-semibold text-foreground/70">
                Obra social
                <input
                  name="obra_social"
                  defaultValue={paciente.obra_social ?? ""}
                  placeholder="Obra social o prepaga"
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
              </label>
              <p className="text-xs text-foreground/60">
                Dejá la obra social vacía si la familia no tiene. El nombre, la
                fecha de nacimiento y el tipo de ficha los corrige la
                administración.
              </p>
              <BotonEnvio variant="secondary" className="justify-self-start">
                Guardar
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
