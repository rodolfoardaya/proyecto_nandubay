import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ACCION_LABEL: Record<string, string> = {
  insert: "Alta",
  update: "Modificación",
  delete: "Baja",
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  impresion: "Impresión",
  exportacion: "Exportación",
  reset_clave: "Reseteo de clave",
};

export default async function Auditoria() {
  await requireRole("direccion", "admin");
  const supabase = await createClient();

  const { data: registros } = await supabase
    .from("auditoria")
    .select("id, created_at, usuario_nombre, usuario_rol, accion, tabla, detalle")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">Auditoría</h1>
      <p className="text-sm text-foreground/60">
        Últimos 200 eventos registrados en el sistema (sesiones, altas, modificaciones, impresiones y exportaciones).
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs font-bold uppercase text-foreground/50">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Tabla</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {registros?.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-foreground/70">
                  {new Date(r.created_at).toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  {r.usuario_nombre ?? "—"}
                  <span className="ml-1 text-xs text-foreground/50 capitalize">
                    ({r.usuario_rol ?? "?"})
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-green-dark">
                  {ACCION_LABEL[r.accion] ?? r.accion}
                </td>
                <td className="px-4 py-3 text-foreground/70">{r.tabla ?? "—"}</td>
                <td className="px-4 py-3 text-foreground/70">{r.detalle ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!registros?.length && (
          <p className="px-4 py-6 text-sm text-foreground/60">Todavía no hay eventos registrados.</p>
        )}
      </div>
    </div>
  );
}
