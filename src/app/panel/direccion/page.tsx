import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-yellow-main/30 text-[#8a6400]",
  confirmado: "bg-green-light/50 text-green-dark",
  cancelado: "bg-orange/20 text-orange",
  ausente: "bg-black/10 text-foreground/60",
};

export default async function PanelDireccion() {
  const usuario = await requireRole("direccion", "admin");
  const supabase = await createClient();

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: turnosHoy } = await supabase
    .from("turnos")
    .select("id, hora, modalidad, estado, pacientes(nombre), tos(nombre)")
    .eq("fecha", hoy)
    .order("hora");

  const { count: totalPacientes } = await supabase
    .from("pacientes")
    .select("id", { count: "exact", head: true })
    .eq("activo", true);

  const { count: totalTos } = await supabase
    .from("tos")
    .select("id", { count: "exact", head: true })
    .eq("activo", true);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">
        Panel de dirección — {usuario.nombre.split(" ")[0]}
      </h1>
      <p className="text-sm text-foreground/60">
        Vista de solo lectura: supervisión de todas las TO, sin edición.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-bold text-foreground/60">Turnos hoy</p>
          <p className="mt-1 text-3xl font-extrabold text-green-dark">
            {turnosHoy?.length ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-foreground/60">Pacientes totales</p>
          <p className="mt-1 text-3xl font-extrabold text-green-dark">
            {totalPacientes ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-foreground/60">TO activas</p>
          <p className="mt-1 text-3xl font-extrabold text-green-dark">
            {totalTos ?? 0}
          </p>
        </Card>
      </div>

      <h2 className="mt-8 font-bold text-green-dark">Turnos de hoy — todas las TO</h2>
      <div className="mt-3 divide-y divide-black/10 rounded-2xl bg-white shadow-sm">
        {turnosHoy && turnosHoy.length > 0 ? (
          turnosHoy.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-semibold">
                  {t.hora} —{" "}
                  {/* @ts-expect-error relación anidada */}
                  {t.pacientes?.nombre}
                </p>
                <p className="text-sm text-foreground/60">
                  {/* @ts-expect-error relación anidada */}
                  {t.tos?.nombre} · {t.modalidad}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${ESTADO_COLOR[t.estado]}`}>
                {t.estado}
              </span>
            </div>
          ))
        ) : (
          <p className="px-5 py-6 text-sm text-foreground/60">
            No hay turnos cargados para hoy.
          </p>
        )}
      </div>
    </div>
  );
}
