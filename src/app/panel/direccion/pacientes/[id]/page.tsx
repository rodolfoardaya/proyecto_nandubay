import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SECCIONES_NINOS, SECCIONES_ADULTOS, CAMPOS_ACUERDO, type DatosFicha } from "@/lib/ficha-fields";
import { calcularDatosFaltantes } from "@/lib/datos-faltantes";
import { Card } from "@/components/ui/Card";

async function archivoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null
) {
  if (!path) return null;
  const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export default async function PerfilPacienteDireccion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("direccion", "admin");
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, numero_registro, tipo, fecha_nacimiento, dni, tos(nombre)")
    .eq("id", id)
    .single();

  if (!paciente) {
    return <p>Paciente no encontrado.</p>;
  }

  const { data: ficha } = await supabase
    .from("fichas_inicio")
    .select("datos, archivo_adjunto_url")
    .eq("paciente_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: acuerdo } = await supabase
    .from("acuerdos_terapeuticos")
    .select(
      "valor_sesion, forma_pago, duracion_sesion_minutos, modalidad, autoriza_imagenes, observaciones, firma_url, archivo_adjunto_url"
    )
    .eq("paciente_id", id)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: evolucion } = await supabase
    .from("notas_evolucion")
    .select("id, fecha, nota, objetivos_trabajados, firma_url")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false });

  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, fecha, hora, tipo, modalidad, estado")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  const acuerdoFirmaUrl = await archivoUrl(supabase, acuerdo?.firma_url ?? null);
  const acuerdoArchivoUrl = await archivoUrl(supabase, acuerdo?.archivo_adjunto_url ?? null);
  const fichaArchivoUrl = await archivoUrl(supabase, ficha?.archivo_adjunto_url ?? null);
  const evolucionConFirma = await Promise.all(
    (evolucion ?? []).map(async (n) => ({
      ...n,
      firmaSignedUrl: await archivoUrl(supabase, n.firma_url),
    }))
  );

  const secciones = paciente.tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  const datos = (ficha?.datos ?? {}) as DatosFicha;
  const acuerdoObservaciones = (acuerdo?.observaciones as Record<string, string>) ?? {};
  const datosFaltantes = calcularDatosFaltantes({
    paciente,
    datosFicha: datos,
    tieneFicha: !!ficha,
    tieneAcuerdo: !!acuerdo,
    secciones,
    ultimaEvolucion: evolucion?.[0]?.fecha ?? null,
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-green-dark">{paciente.nombre}</h1>
      <p className="text-sm text-foreground/60">
        Nº {paciente.numero_registro} · {paciente.tipo}
        {paciente.fecha_nacimiento && ` · Nace ${paciente.fecha_nacimiento}`}
        {paciente.dni && ` · DNI ${paciente.dni}`}
        {/* @ts-expect-error relación anidada */}
        {paciente.tos?.nombre && ` · TO: ${paciente.tos.nombre}`}
      </p>
      <p className="mt-2 text-xs font-semibold text-blue-mid">Vista de solo lectura</p>

      {datosFaltantes.length > 0 && (
        <Card className="mt-4 border-yellow-main/50 bg-yellow-soft/20">
          <p className="font-bold text-[#8a6400]">
            Datos pendientes de completar ({datosFaltantes.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {datosFaltantes.map((f) => (
              <span
                key={f}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#8a6400] shadow-sm"
              >
                {f}
              </span>
            ))}
          </div>
        </Card>
      )}

      <h2 className="mt-8 font-bold text-green-dark">Ficha de inicio</h2>
      {fichaArchivoUrl && (
        <a href={fichaArchivoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-blue-mid hover:underline">
          Ver planilla adjunta (PDF/foto original)
        </a>
      )}
      <div className="mt-3 grid gap-3">
        {secciones.map((seccion) => {
          const contenido = seccion.campos
            .map((c) => [c.label, datos[c.key]] as const)
            .filter(([, v]) => v?.valor || v?.observacion);
          if (!contenido.length) return null;
          return (
            <Card key={seccion.titulo}>
              <p className="font-bold text-green-dark">{seccion.titulo}</p>
              <dl className="mt-2 grid gap-2 text-sm">
                {contenido.map(([label, item]) => (
                  <div key={label}>
                    <dt className="font-semibold text-foreground/70">{label}</dt>
                    <dd className="text-foreground/90">{item.valor}</dd>
                    {item.observacion && (
                      <dd className="mt-0.5 text-xs italic text-foreground/50">Obs: {item.observacion}</dd>
                    )}
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
        {!ficha && <p className="text-sm text-foreground/60">Sin ficha de inicio cargada.</p>}
      </div>

      <h2 className="mt-8 font-bold text-green-dark">Acuerdo terapéutico</h2>
      {acuerdo ? (
        <Card className="mt-3">
          {acuerdoArchivoUrl && (
            <a href={acuerdoArchivoUrl} target="_blank" rel="noreferrer" className="mb-2 inline-block text-xs font-semibold text-blue-mid hover:underline">
              Ver planilla adjunta (PDF/foto original)
            </a>
          )}
          <dl className="grid gap-2 text-sm">
            {CAMPOS_ACUERDO.map((c) => {
              const valor =
                c.key === "autoriza_imagenes"
                  ? acuerdo.autoriza_imagenes
                    ? "Sí"
                    : "No"
                  : c.key === "modalidad"
                    ? acuerdo.modalidad
                    : c.key === "duracion_sesion_minutos"
                      ? `${acuerdo.duracion_sesion_minutos} min`
                      : c.key === "forma_pago"
                        ? acuerdo.forma_pago || "—"
                        : `$${acuerdo.valor_sesion}`;
              return (
                <div key={c.key}>
                  <dt className="font-semibold text-foreground/70">{c.label}</dt>
                  <dd className="text-foreground/90">{valor}</dd>
                  {acuerdoObservaciones[c.key] && (
                    <dd className="mt-0.5 text-xs italic text-foreground/50">Obs: {acuerdoObservaciones[c.key]}</dd>
                  )}
                </div>
              );
            })}
          </dl>
          {acuerdoFirmaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={acuerdoFirmaUrl} alt="Firma de la TO" className="mt-2 h-12 rounded border border-black/10 bg-white" />
          )}
        </Card>
      ) : (
        <p className="mt-3 text-sm text-foreground/60">Sin acuerdo cargado.</p>
      )}

      <h2 className="mt-8 font-bold text-green-dark">Evolución</h2>
      <div className="mt-3 grid gap-3">
        {evolucionConFirma.map((n) => (
          <Card key={n.id}>
            <p className="text-xs font-bold text-foreground/50">{n.fecha}</p>
            <p className="mt-1 text-sm">{n.nota}</p>
            {n.objetivos_trabajados && (
              <p className="mt-1 text-sm text-blue-mid">Objetivos: {n.objetivos_trabajados}</p>
            )}
            {n.firmaSignedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.firmaSignedUrl} alt="Firma de la TO" className="mt-2 h-12 rounded border border-black/10 bg-white" />
            )}
          </Card>
        ))}
        {!evolucionConFirma.length && (
          <p className="text-sm text-foreground/60">Sin notas de evolución.</p>
        )}
      </div>

      <h2 className="mt-8 font-bold text-green-dark">Turnos</h2>
      <div className="mt-3 grid gap-2">
        {turnos?.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm text-sm">
            <span>
              {t.fecha} · {t.hora} — {t.tipo} · {t.modalidad}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                t.estado === "confirmado"
                  ? "bg-green-light/50 text-green-dark"
                  : t.estado === "cancelado"
                    ? "bg-orange/20 text-orange"
                    : "bg-yellow-main/30 text-[#8a6400]"
              }`}
            >
              {t.estado}
            </span>
          </div>
        ))}
        {!turnos?.length && <p className="text-sm text-foreground/60">Sin turnos cargados todavía.</p>}
      </div>
    </div>
  );
}
