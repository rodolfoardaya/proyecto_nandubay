import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { FormularioReporteSeguimiento } from "@/components/FormularioReporteSeguimiento";

export default async function Reportes({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const usuario = await requireRole("to", "admin");
  const { to } = await searchParams;

  // El admin ve las agendas de todas las TO juntas: útil para una mirada
  // general, inservible para contrastar contra la agenda de una. Por eso
  // puede elegir una y que el PDF traiga sólo esa.
  const esAdmin = usuario.rol === "admin";
  const supabase = await createClient();
  const { data: tos } = esAdmin
    ? await supabase.from("tos").select("id, nombre").eq("activo", true).order("nombre")
    : { data: [] };

  const toElegida = (tos ?? []).find((t) => t.id === to);
  const filtro = toElegida ? `&to=${toElegida.id}` : "";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-green-dark">Reportes de turnos</h1>

      {esAdmin && (tos ?? []).length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground/70">Agenda de:</p>
          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            <Link
              href="/panel/admin/reportes"
              className={`rounded-full px-3 py-1.5 font-semibold ${
                toElegida ? "border border-black/10" : "bg-green-mid text-white"
              }`}
            >
              Todas
            </Link>
            {(tos ?? []).map((t) => (
              <Link
                key={t.id}
                href={`/panel/admin/reportes?to=${t.id}`}
                className={`rounded-full px-3 py-1.5 font-semibold ${
                  t.id === toElegida?.id ? "bg-green-mid text-white" : "border border-black/10"
                }`}
              >
                {t.nombre}
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-foreground/60">
            {toElegida
              ? `Los PDF de abajo van a traer sólo los turnos de ${toElegida.nombre}.`
              : "Los PDF de abajo traen los turnos de todas las TO juntos."}
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="font-bold text-green-dark">Turnos de hoy</p>
          <a
            href={`/api/reporte-turnos?rango=dia${filtro}`}
            className="mt-3 inline-block rounded-full bg-green-mid px-5 py-2 font-bold text-white hover:bg-green-dark"
          >
            Descargar PDF
          </a>
        </Card>
        <Card>
          <p className="font-bold text-green-dark">Turnos de la semana</p>
          <p className="mt-1 text-xs text-foreground/60">
            De lunes a sábado, la semana en curso.
          </p>
          <a
            href={`/api/reporte-turnos?rango=semana${filtro}`}
            className="mt-3 inline-block rounded-full bg-green-mid px-5 py-2 font-bold text-white hover:bg-green-dark"
          >
            Descargar PDF
          </a>
        </Card>
      </div>

      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-green-dark">Seguimiento: ausencias y cobros</h2>
        <p className="mt-1 mb-4 text-sm text-foreground/60">
          Elegí el período y qué querés listar. Para cerrar el mes, la
          combinación útil es <b>Adeudados</b> del 1 al último día.
        </p>
        <FormularioReporteSeguimiento />
      </section>
    </div>
  );
}
