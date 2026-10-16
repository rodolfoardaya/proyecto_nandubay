import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TareaForm } from "@/components/TareaForm";
import { cambiarEstadoTarea, eliminarTarea } from "./actions";
import { hoyIso, ZONA, fechaLegible } from "@/lib/fecha";
import {
  ESTADOS,
  etiquetaCategoria,
  etiquetaPrioridad,
  estaVencida,
  type Tarea,
  type EstadoTarea,
} from "@/lib/tareas";

export const metadata = { title: "Tareas y recordatorios — Ñandubay" };

type Params = Promise<{ ver?: string; orden?: string }>;

export default async function Tareas({ searchParams }: { searchParams: Params }) {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();
  const p = await searchParams;

  const ver = (["pendiente", "en_progreso", "completada"] as const).includes(p.ver as EstadoTarea)
    ? (p.ver as EstadoTarea)
    : "todas";
  // Por defecto lo que vence antes va primero: es el orden en que hay que
  // ocuparse de las cosas.
  const ascendente = p.orden !== "desc";

  let consulta = supabase
    .from("tareas")
    .select("*")
    .order("fecha_limite", { ascending: ascendente })
    .order("hora_limite", { ascending: ascendente });
  if (ver !== "todas") consulta = consulta.eq("estado", ver);

  const { data: tareasRaw } = await consulta;
  const tareas = (tareasRaw ?? []) as Tarea[];

  // Para el formulario: quiénes pueden hacerse cargo y a qué paciente puede
  // referirse la tarea. Los pacientes dados de baja no se ofrecen.
  const { data: responsables } = await supabase
    .from("usuarios")
    .select("id, nombre, rol")
    .in("rol", ["to", "admin"])
    .order("nombre");

  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nombre, numero_registro")
    .neq("estado", "baja")
    .order("nombre");

  const opcionesResponsable = (responsables ?? []).map((r) => ({
    id: r.id,
    nombre: r.id === usuario.id ? `${r.nombre} (vos)` : r.nombre,
  }));
  const opcionesPaciente = (pacientes ?? []).map((x) => ({
    id: x.id,
    nombre: `${x.numero_registro} — ${x.nombre}`,
  }));

  const nombrePaciente = new Map(opcionesPaciente.map((x) => [x.id, x.nombre]));
  const nombreResponsable = new Map((responsables ?? []).map((r) => [r.id, r.nombre]));

  const hoy = hoyIso();
  const ahoraHHMM = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  const base = `/panel/${usuario.rol}/tareas`;
  const url = (extra: Record<string, string>) =>
    `${base}?${new URLSearchParams({ ver, orden: ascendente ? "asc" : "desc", ...extra })}`;

  const FILTROS = [
    { valor: "todas", label: "Todas" },
    { valor: "pendiente", label: "Pendientes" },
    { valor: "en_progreso", label: "En progreso" },
    { valor: "completada", label: "Completadas" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-green-dark">Tareas y recordatorios</h1>
        <div className="flex items-center gap-2">
          <Link
            href={url({ orden: ascendente ? "desc" : "asc" })}
            title="Ordenar por fecha límite"
            className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold hover:bg-green-light/20"
          >
            Fecha límite {ascendente ? "↑" : "↓"}
          </Link>
          <TareaForm responsables={opcionesResponsable} pacientes={opcionesPaciente} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 text-sm">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={url({ ver: f.valor })}
            className={`rounded-full px-3 py-1.5 font-semibold ${
              f.valor === ver ? "bg-green-mid text-white" : "border border-black/10"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {tareas.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">
          No hay tareas para mostrar. Creá una con el botón «+ Nueva».
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {tareas.map((t) => {
            const prio = etiquetaPrioridad(t.prioridad);
            const vencida = estaVencida(t, hoy, ahoraHHMM);
            const completada = t.estado === "completada";
            return (
              <li
                key={t.id}
                className={`flex flex-wrap items-start gap-x-3 gap-y-2 rounded-2xl bg-white p-4 shadow-sm ${
                  vencida ? "ring-1 ring-orange/50" : ""
                }`}
              >
                {/* Tildar para dar por completada. */}
                <form action={cambiarEstadoTarea} className="pt-0.5">
                  <input type="hidden" name="tarea_id" value={t.id} />
                  <input
                    type="hidden"
                    name="estado"
                    value={completada ? "pendiente" : "completada"}
                  />
                  <button
                    type="submit"
                    title={completada ? "Marcar como pendiente" : "Marcar como completada"}
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 text-xs font-bold ${
                      completada
                        ? "border-green-mid bg-green-mid text-white"
                        : "border-black/20 text-transparent hover:border-green-mid"
                    }`}
                  >
                    ✓
                  </button>
                </form>

                <div className="min-w-48 flex-1">
                  <p
                    className={`font-semibold ${
                      completada ? "text-foreground/40 line-through" : "text-green-dark"
                    }`}
                  >
                    {t.titulo}
                  </p>
                  {t.descripcion && (
                    <p className="mt-0.5 text-sm text-foreground/60">{t.descripcion}</p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/50">
                    <span className={`rounded-full px-2 py-0.5 font-bold ${prio.color}`}>
                      {prio.label}
                    </span>
                    {etiquetaCategoria(t.categoria) && <span>{etiquetaCategoria(t.categoria)}</span>}
                    <span className={vencida ? "font-bold text-orange" : ""}>
                      Vence {fechaLegible(t.fecha_limite + "T12:00:00")} a las{" "}
                      {t.hora_limite.slice(0, 5)}
                      {vencida ? " — vencida" : ""}
                    </span>
                    {/* Quién la hace: alguien del equipo o el propio paciente. */}
                    {t.responsable_usuario_id && nombreResponsable.get(t.responsable_usuario_id) && (
                      <span>· {nombreResponsable.get(t.responsable_usuario_id)}</span>
                    )}
                    {t.responsable_paciente_id && nombrePaciente.get(t.responsable_paciente_id) && (
                      <span className="font-semibold text-blue-mid">
                        · lo hace {nombrePaciente.get(t.responsable_paciente_id)}
                      </span>
                    )}
                    {t.paciente_id && nombrePaciente.get(t.paciente_id) && (
                      <span>· {nombrePaciente.get(t.paciente_id)}</span>
                    )}
                    {(t.avisar_email || t.avisar_whatsapp) && (
                      <span title="Avisa 24 horas antes">
                        · aviso {t.avisar_email ? "correo" : ""}
                        {t.avisar_email && t.avisar_whatsapp ? " y " : ""}
                        {t.avisar_whatsapp ? "WhatsApp" : ""}
                      </span>
                    )}
                  </p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <form action={cambiarEstadoTarea}>
                    <input type="hidden" name="tarea_id" value={t.id} />
                    <select
                      name="estado"
                      defaultValue={t.estado}
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs"
                    >
                      {ESTADOS.map((e) => (
                        <option key={e.valor} value={e.valor}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="ml-1 text-xs font-bold text-blue-mid hover:underline">
                      Aplicar
                    </button>
                  </form>

                  <TareaForm
                    responsables={opcionesResponsable}
                    pacientes={opcionesPaciente}
                    tarea={t}
                    disparador={
                      <button
                        type="button"
                        title="Editar la tarea"
                        className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-blue-light/20"
                      >
                        ✏️
                      </button>
                    }
                  />

                  <form action={eliminarTarea}>
                    <input type="hidden" name="tarea_id" value={t.id} />
                    <button
                      type="submit"
                      title="Eliminar la tarea"
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-orange/15"
                    >
                      🗑️
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
