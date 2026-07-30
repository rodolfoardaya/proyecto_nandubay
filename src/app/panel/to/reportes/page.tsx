import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/Card";

export default async function Reportes() {
  await requireRole("to", "admin");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold text-green-dark">Reportes de turnos</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="font-bold text-green-dark">Turnos de hoy</p>
          <a
            href="/api/reporte-turnos?rango=dia"
            className="mt-3 inline-block rounded-full bg-green-mid px-5 py-2 font-bold text-white hover:bg-green-dark"
          >
            Descargar PDF
          </a>
        </Card>
        <Card>
          <p className="font-bold text-green-dark">Próximos 7 días</p>
          <a
            href="/api/reporte-turnos?rango=semana"
            className="mt-3 inline-block rounded-full bg-green-mid px-5 py-2 font-bold text-white hover:bg-green-dark"
          >
            Descargar PDF
          </a>
        </Card>
      </div>
    </div>
  );
}
