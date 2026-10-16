import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { VenderPaquete } from "@/components/VenderPaquete";
import { cambiarPagoPaquete } from "./paquetes-actions";
import { fechaLegible } from "@/lib/fecha";
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
    .select("id, nombre, numero_registro")
    .neq("estado", "baja")
    .order("nombre");

  const { data: facturas } = await supabase
    .from("facturas")
    .select("id, fecha_facturacion, monto, fecha_vencimiento_estimada, estado_cobro, pacientes(nombre)")
    .order("fecha_facturacion", { ascending: false });

  const { data: paquetes } = await supabase
    .from("paquetes_sesiones")
    .select("id, cantidad_sesiones, precio_total, fecha_inicio, fecha_fin, pagado, nota, created_at, pacientes(nombre, numero_registro)")
    .order("created_at", { ascending: false });

  const stats = { pagada: 0, a_cobrar: 0, vencida: 0 };
  for (const f of facturas ?? []) {
    stats[f.estado_cobro as keyof typeof stats] = (stats[f.estado_cobro as keyof typeof stats] ?? 0) + 1;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-green-dark">Facturación</h1>
        <VenderPaquete
          pacientes={(pacientes ?? []).map((p) => ({
            id: p.id,
            nombre: `${p.numero_registro} — ${p.nombre}`,
          }))}
        />
      </div>

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

      {/* Paquetes de sesiones vendidos. Se registran y se cobran; todavía no
          descuentan sesiones a medida que se dan los turnos. */}
      <h2 className="mt-8 font-bold text-green-dark">Paquetes de sesiones</h2>
      <div className="mt-3 grid gap-2">
        {(paquetes ?? []).map((q) => (
          <Card key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-green-dark">
              {/* @ts-expect-error relación anidada */}
              {q.pacientes?.numero_registro} — {/* @ts-expect-error relación anidada */}
              {q.pacientes?.nombre}
            </span>
            <span className="text-sm text-foreground/70">
              {q.cantidad_sesiones} sesiones · ${Number(q.precio_total).toLocaleString("es-AR")}
            </span>
            {q.fecha_inicio && (
              <span className="text-xs text-foreground/50">
                del {fechaLegible(q.fecha_inicio + "T12:00:00")}
                {q.fecha_fin ? ` al ${fechaLegible(q.fecha_fin + "T12:00:00")}` : ""}
              </span>
            )}
            {q.nota && <span className="text-xs italic text-foreground/50">{q.nota}</span>}
            <span className="ml-auto flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  q.pagado ? "bg-green-light/50 text-green-dark" : "bg-orange/20 text-orange"
                }`}
              >
                {q.pagado ? "Pagado" : "Adeudado"}
              </span>
              <form action={cambiarPagoPaquete}>
                <input type="hidden" name="paquete_id" value={q.id} />
                <input type="hidden" name="pagado" value={q.pagado ? "no" : "si"} />
                <button className="text-xs font-bold text-blue-mid hover:underline">
                  Marcar como {q.pagado ? "adeudado" : "pagado"}
                </button>
              </form>
            </span>
          </Card>
        ))}
        {!paquetes?.length && (
          <p className="text-sm text-foreground/60">Todavía no se vendió ningún paquete.</p>
        )}
      </div>
    </div>
  );
}
