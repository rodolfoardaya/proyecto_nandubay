import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function Backups() {
  const usuario = await requireRole("to", "admin");
  const supabase = await createClient();

  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nombre, numero_registro")
    .order("nombre");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold text-green-dark">Backups</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Descargá un PDF con la historia clínica (ficha de inicio, acuerdo
        terapéutico y evolución) de {usuario.rol === "admin" ? "cualquier paciente o de todos" : "tus pacientes"}.
      </p>

      <Card className="mt-6">
        <p className="font-bold text-green-dark">
          Backup completo ({usuario.rol === "admin" ? "todos los pacientes" : "mis pacientes"})
        </p>
        <a
          href="/api/backup"
          className="mt-3 inline-block rounded-full bg-green-mid px-5 py-2 font-bold text-white hover:bg-green-dark"
        >
          Descargar PDF
        </a>
      </Card>

      <h2 className="mt-8 font-bold text-green-dark">Por paciente</h2>
      <div className="mt-3 grid gap-2">
        {pacientes?.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <span className="text-sm">
              {p.nombre} <span className="text-foreground/50">Nº {p.numero_registro}</span>
            </span>
            <a
              href={`/api/backup?paciente_id=${p.id}`}
              className="text-sm font-bold text-blue-mid hover:underline"
            >
              Descargar PDF
            </a>
          </Card>
        ))}
        {!pacientes?.length && (
          <p className="text-sm text-foreground/60">No hay pacientes cargados.</p>
        )}
      </div>
    </div>
  );
}
