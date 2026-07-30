import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TablaPacientes } from "@/components/TablaPacientes";

// El admin solo consulta y modifica pacientes ya cargados por la TO — el
// alta de pacientes es tarea exclusiva de la TO, por eso no hay botón de
// "Nuevo paciente" acá.
export default async function ListaPacientesAdmin() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: tos } = await supabase.from("tos").select("id, nombre, letra").order("nombre");
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, numero_registro, nombre, dni, tipo, to_asignada_id")
    .order("numero_registro");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">Pacientes por TO</h1>

      <div className="mt-6 grid gap-8">
        {tos?.map((to) => {
          const propios = (pacientes ?? []).filter((p) => p.to_asignada_id === to.id);
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
                <TablaPacientes pacientes={propios} base="/panel/admin/pacientes" />
              </div>
            </div>
          );
        })}
        {!tos?.length && <p className="text-sm text-foreground/60">Todavía no hay TO cargadas.</p>}
      </div>
    </div>
  );
}
