import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function PanelFamiliar() {
  const usuario = await requireRole();
  const supabase = await createClient();

  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, fecha, hora, modalidad, estado, pacientes(nombre), tos(nombre)")
    .gte("fecha", new Date().toISOString().slice(0, 10))
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .limit(5);

  const proximo = turnos?.[0];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">
        Hola, {usuario.nombre.split(" ")[0]}
      </h1>

      <Card className="mt-6">
        <p className="text-sm font-bold text-foreground/60">Próximo turno</p>
        {proximo ? (
          <p className="mt-2 text-lg font-bold text-green-dark">
            {proximo.fecha} — {proximo.hora} ·{" "}
            {/* @ts-expect-error relación anidada */}
            {proximo.tos?.nombre} ({proximo.modalidad})
          </p>
        ) : (
          <p className="mt-2 text-foreground/70">No tenés turnos próximos.</p>
        )}
      </Card>

      <div className="mt-6 flex gap-3">
        <a
          href="/panel/familiar/turnos"
          className="rounded-full bg-green-mid px-5 py-2 font-bold text-white hover:bg-green-dark"
        >
          Ver mis turnos
        </a>
        <a
          href="/panel/familiar/turnos?nuevo=1"
          className="rounded-full bg-yellow-main px-5 py-2 font-bold text-[#1c4d4f] hover:brightness-95"
        >
          Solicitar turno
        </a>
      </div>
    </div>
  );
}
