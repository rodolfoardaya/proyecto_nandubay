import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { solicitarTurno } from "./actions";

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-yellow-main/30 text-[#8a6400]",
  confirmado: "bg-green-light/50 text-green-dark",
  cancelado: "bg-orange/20 text-orange",
  ausente: "bg-black/10 text-foreground/60",
};

export default async function TurnosFamiliar() {
  const usuario = await requireRole();
  const supabase = await createClient();

  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nombre")
    .eq("familiar_id", usuario.id);

  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, fecha, hora, modalidad, estado, tipo, pacientes(nombre), tos(nombre)")
    .in("paciente_id", (pacientes ?? []).map((p) => p.id))
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">Mis turnos</h1>

      {pacientes && pacientes.length > 0 ? (
        <>
          <h2 className="mt-6 font-bold text-green-dark">Solicitar turno</h2>
          <form action={solicitarTurno} className="mt-3 grid max-w-md gap-3 rounded-2xl bg-white p-5 shadow-sm">
            <select
              required
              name="paciente_id"
              className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
            >
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="date"
                name="fecha"
                className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
              />
              <input
                required
                type="time"
                name="hora"
                className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
              />
            </div>
            <select
              name="modalidad"
              className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
            <Button type="submit" variant="cta" className="justify-self-start">
              Solicitar turno
            </Button>
          </form>
        </>
      ) : (
        <p className="mt-4 text-sm text-foreground/60">
          Todavía no tenés ningún paciente vinculado a tu cuenta.
        </p>
      )}

      <h2 className="mt-8 font-bold text-green-dark">Próximos e historial</h2>
      <div className="mt-3 grid gap-2">
        {turnos?.map((t) => (
          <Card key={t.id} className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-semibold">
                {t.fecha} · {t.hora} —{" "}
                {/* @ts-expect-error relación anidada */}
                {t.pacientes?.nombre}
              </p>
              <p className="text-foreground/60">
                {/* @ts-expect-error relación anidada */}
                {t.tos?.nombre} · {t.modalidad}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${ESTADO_COLOR[t.estado]}`}
            >
              {t.estado}
            </span>
          </Card>
        ))}
        {!turnos?.length && (
          <p className="text-sm text-foreground/60">Sin turnos cargados.</p>
        )}
      </div>
    </div>
  );
}
