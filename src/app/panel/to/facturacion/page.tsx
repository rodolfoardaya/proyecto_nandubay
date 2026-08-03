import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { FacturaUploadForm } from "@/components/FacturaUploadForm";
import { actualizarEstadoCobro } from "./actions";

const ESTADO_COLOR: Record<string, string> = {
  pagada: "bg-green-light/50 text-green-dark",
  a_cobrar: "bg-yellow-main/30 text-[#8a6400]",
  vencida: "bg-orange/20 text-orange",
};

const ESTADO_LABEL: Record<string, string> = {
  pagada: "Pagada",
  a_cobrar: "A cobrar",
  vencida: "Vencida",
};

export default async function Facturacion() {
  await requireRole("to", "admin");
  const supabase = await createClient();

  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  const { data: facturas } = await supabase
    .from("facturas")
    .select("id, fecha_facturacion, monto, fecha_vencimiento_estimada, estado_cobro, pacientes(nombre)")
    .order("fecha_facturacion", { ascending: false });

  const stats = { pagada: 0, a_cobrar: 0, vencida: 0 };
  for (const f of facturas ?? []) {
    stats[f.estado_cobro as keyof typeof stats] = (stats[f.estado_cobro as keyof typeof stats] ?? 0) + 1;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-green-dark">Facturación</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm font-bold text-foreground/60">Pagadas</p>
          <p className="mt-1 text-2xl font-extrabold text-green-dark">{stats.pagada}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-foreground/60">A cobrar</p>
          <p className="mt-1 text-2xl font-extrabold text-green-dark">{stats.a_cobrar}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-foreground/60">Vencidas</p>
          <p className="mt-1 text-2xl font-extrabold text-green-dark">{stats.vencida}</p>
        </Card>
      </div>

      <h2 className="mt-8 font-bold text-green-dark">Cargar factura</h2>
      <p className="text-sm text-foreground/60">
        Adjuntá el PDF: la IA intenta leer fecha, monto y vencimiento
        automáticamente, pero siempre revisá los datos antes de guardar.
      </p>
      <FacturaUploadForm pacientes={pacientes ?? []} />

      <h2 className="mt-8 font-bold text-green-dark">Facturas</h2>
      <div className="mt-3 grid gap-2">
        {facturas?.map((f) => (
          <Card key={f.id} className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-semibold">
                {/* @ts-expect-error relación anidada */}
                {f.pacientes?.nombre}
              </p>
              <p className="text-foreground/60">
                {f.fecha_facturacion ?? "s/fecha"} · ${f.monto ?? "—"} · vence{" "}
                {f.fecha_vencimiento_estimada ?? "—"}
              </p>
            </div>
            <form action={actualizarEstadoCobro} className="flex items-center gap-2">
              <input type="hidden" name="factura_id" value={f.id} />
              <select
                name="estado_cobro"
                defaultValue={f.estado_cobro}
                className={`rounded-full px-3 py-1 text-xs font-bold ${ESTADO_COLOR[f.estado_cobro]}`}
              >
                {Object.entries(ESTADO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button className="text-xs font-bold text-blue-mid hover:underline">
                Guardar
              </button>
            </form>
          </Card>
        ))}
        {!facturas?.length && (
          <p className="text-sm text-foreground/60">Sin facturas cargadas.</p>
        )}
      </div>
    </div>
  );
}
