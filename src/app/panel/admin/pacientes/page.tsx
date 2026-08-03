import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TablaPacientes } from "@/components/TablaPacientes";
import { reactivarPaciente } from "./actions";

// El admin solo consulta, modifica y da de baja pacientes ya cargados por la
// TO — el alta es tarea exclusiva de la TO (de ahí sale la letra del número
// de registro), por eso no hay botón de "Nuevo paciente" acá.
export default async function ListaPacientesAdmin() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: tos } = await supabase.from("tos").select("id, nombre, letra").order("nombre");
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, numero_registro, nombre, dni, tipo, to_asignada_id, activo, baja_at, baja_motivo")
    .order("numero_registro");

  const dadosDeBaja = (pacientes ?? []).filter((p) => p.activo === false);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">Pacientes por TO</h1>

      <div className="mt-6 grid gap-8">
        {tos?.map((to) => {
          const propios = (pacientes ?? []).filter(
            (p) => p.to_asignada_id === to.id && p.activo !== false
          );
          return (
            <div key={to.id}>
              <h2 className="font-bold text-green-dark">
                {to.nombre}
                {to.letra && <span className="ml-2 text-sm font-normal text-foreground/50">letra {to.letra}</span>}
                <span className="ml-2 text-sm font-normal text-foreground/50">
                  — {propios.length} paciente{propios.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="mt-2">
                <TablaPacientes pacientes={propios} base="/panel/admin/pacientes" mostrarBaja />
              </div>
            </div>
          );
        })}
        {!tos?.length && <p className="text-sm text-foreground/60">Todavía no hay TO cargadas.</p>}
      </div>

      {dadosDeBaja.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer font-bold text-green-dark">
            Pacientes dados de baja ({dadosDeBaja.length})
          </summary>
          <p className="mt-2 max-w-2xl text-sm text-foreground/60">
            No aparecen en las listas de trabajo, pero su historia clínica sigue
            guardada y auditada. Reactivalos para volver a verlos.
          </p>
          <div className="mt-4 grid gap-2">
            {dadosDeBaja.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-sm"
              >
                <span className="font-semibold text-foreground/70">{p.numero_registro}</span>
                <span className="font-bold text-green-dark">{p.nombre}</span>
                {p.baja_at && (
                  <span className="text-xs text-foreground/50">
                    baja del {new Date(p.baja_at).toLocaleDateString("es-AR")}
                  </span>
                )}
                {p.baja_motivo && (
                  <span className="text-xs italic text-foreground/50">{p.baja_motivo}</span>
                )}
                <form action={reactivarPaciente} className="ml-auto">
                  <input type="hidden" name="paciente_id" value={p.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-green-mid hover:underline"
                  >
                    Reactivar
                  </button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
