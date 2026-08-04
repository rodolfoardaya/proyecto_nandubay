import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SECCIONES_NINOS, SECCIONES_ADULTOS, type DatosFicha } from "@/lib/ficha-fields";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FirmaPad } from "@/components/FirmaPad";
import { FichaCamposEditables } from "@/components/FichaCamposEditables";
import { AcuerdoTerapeuticoForm } from "@/components/AcuerdoTerapeuticoForm";
import { calcularDatosFaltantes } from "@/lib/datos-faltantes";
import { DocumentosPaciente } from "@/components/DocumentosPaciente";
import {
  actualizarFichaInicio,
  actualizarAcuerdo,
  agregarNotaEvolucion,
  guardarAcuerdo,
} from "../actions";
import { crearTurno } from "../../turnos/actions";

async function archivoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null
) {
  if (!path) return null;
  const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export default async function PerfilPaciente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("to", "admin");
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, numero_registro, tipo, fecha_nacimiento, dni, familiar_id, tos(nombre)")
    .eq("id", id)
    .single();

  if (!paciente) {
    return <p>Paciente no encontrado.</p>;
  }

  const { data: ficha } = await supabase
    .from("fichas_inicio")
    .select("id, datos, archivo_adjunto_url")
    .eq("paciente_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: acuerdo } = await supabase
    .from("acuerdos_terapeuticos")
    .select(
      "id, valor_sesion, forma_pago, duracion_sesion_minutos, modalidad, autoriza_imagenes, observaciones, fecha, firma_url, archivo_adjunto_url"
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

  const { data: documentos } = await supabase
    .from("documentos_paciente")
    .select("id, tipo, titulo, descripcion, nombre_original, tamano_bytes, archivo_url, created_at")
    .eq("paciente_id", id)
    .eq("vigente", true)
    .order("created_at", { ascending: false });

  const documentosConUrl = await Promise.all(
    (documentos ?? []).map(async (d) => ({
      ...d,
      url: await archivoUrl(supabase, d.archivo_url),
    }))
  );

  const acuerdoFirmaUrl = await archivoUrl(supabase, acuerdo?.firma_url ?? null);
  const acuerdoArchivoUrl = await archivoUrl(supabase, acuerdo?.archivo_adjunto_url ?? null);
  const fichaArchivoUrl = await archivoUrl(supabase, ficha?.archivo_adjunto_url ?? null);
  const evolucionConFirma = await Promise.all(
    (evolucion ?? []).map(async (n) => ({
      ...n,
      firmaSignedUrl: await archivoUrl(supabase, n.firma_url),
    }))
  );

  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, fecha, hora, tipo, modalidad, estado")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  const secciones = paciente.tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  const datos = (ficha?.datos ?? {}) as DatosFicha;
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
      </p>

      <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
        <a
          href={`/api/imprimir/ficha?paciente_id=${paciente.id}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-black/10 px-4 py-2 text-blue-mid hover:bg-blue-light/20"
        >
          Imprimir ficha de inicio
        </a>
        <a
          href={`/api/imprimir/acuerdo?paciente_id=${paciente.id}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-black/10 px-4 py-2 text-blue-mid hover:bg-blue-light/20"
        >
          Imprimir acuerdo terapéutico
        </a>
        <a
          href={`/api/backup?paciente_id=${paciente.id}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-black/10 px-4 py-2 text-blue-mid hover:bg-blue-light/20"
        >
          Imprimir historia clínica
        </a>
      </div>

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
          <p className="mt-2 text-xs text-foreground/60">
            Se pueden ir completando en las próximas consultas.
          </p>
        </Card>
      )}

      {/* Ficha de inicio */}
      <h2 className="mt-8 font-bold text-green-dark">Ficha de inicio</h2>
      {ficha ? (
        <form action={actualizarFichaInicio} className="mt-3 grid gap-3">
          <input type="hidden" name="paciente_id" value={paciente.id} />
          <input type="hidden" name="ficha_id" value={ficha.id} />
          <input type="hidden" name="tipo" value={paciente.tipo} />
          <div className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold text-foreground/70">
              Reemplazar planilla adjunta (PDF o foto, opcional)
              <input
                type="file"
                name="archivo_ficha"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                capture="environment"
                className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
              />
            </label>
            {fichaArchivoUrl && (
              <a href={fichaArchivoUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-mid hover:underline">
                Ver planilla adjunta actual
              </a>
            )}
          </div>
          <FichaCamposEditables secciones={secciones} datosIniciales={datos} />
          <Button type="submit" variant="primary" className="justify-self-start">
            Guardar cambios en la ficha
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-foreground/60">Sin ficha de inicio cargada.</p>
      )}

      {/* Acuerdo terapéutico */}
      <h2 className="mt-8 font-bold text-green-dark">Acuerdo terapéutico</h2>
      <AcuerdoTerapeuticoForm
        action={acuerdo ? actualizarAcuerdo : guardarAcuerdo}
        pacienteId={paciente.id}
        acuerdoId={acuerdo?.id}
        tipo={paciente.tipo}
        valoresIniciales={{
          valor_sesion: acuerdo?.valor_sesion != null ? String(acuerdo.valor_sesion) : "",
          forma_pago: acuerdo?.forma_pago ?? "",
          duracion_sesion_minutos: acuerdo?.duracion_sesion_minutos != null ? String(acuerdo.duracion_sesion_minutos) : "45",
          modalidad: acuerdo?.modalidad ?? "presencial",
          autoriza_imagenes: acuerdo?.autoriza_imagenes ?? false,
        }}
        firmaActualUrl={acuerdoFirmaUrl}
        archivoAdjuntoUrl={acuerdoArchivoUrl}
        etiquetaSubmit={acuerdo ? "Guardar cambios del acuerdo" : "Guardar acuerdo"}
      />

      {/* Evolución */}
      <h2 className="mt-8 font-bold text-green-dark">Evolución</h2>
      <form action={agregarNotaEvolucion} className="mt-3 grid gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <input type="hidden" name="paciente_id" value={paciente.id} />
        <textarea
          required
          name="nota"
          rows={3}
          placeholder="Nota de la visita"
          className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
        />
        <input
          name="objetivos_trabajados"
          placeholder="Objetivos trabajados"
          className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
        />
        <FirmaPad name="firma" />
        <Button type="submit" variant="secondary" className="justify-self-start">
          Agregar nota
        </Button>
      </form>

      <div className="mt-4 grid gap-3">
        {evolucionConFirma.map((n) => (
          <Card key={n.id}>
            <p className="text-xs font-bold text-foreground/50">{n.fecha}</p>
            <p className="mt-1 text-sm">{n.nota}</p>
            {n.objetivos_trabajados && (
              <p className="mt-1 text-sm text-blue-mid">
                Objetivos: {n.objetivos_trabajados}
              </p>
            )}
            {n.firmaSignedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={n.firmaSignedUrl}
                alt="Firma de la TO"
                className="mt-2 h-12 rounded border border-black/10 bg-white"
              />
            )}
          </Card>
        ))}
      </div>

      {/* Turnos */}
      <h2 className="mt-8 font-bold text-green-dark">Turnos</h2>
      <form action={crearTurno} className="mt-3 grid max-w-md gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <input type="hidden" name="paciente_id" value={paciente.id} />
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
        <div className="grid grid-cols-2 gap-3">
          <select
            name="tipo"
            className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          >
            <option value="fijo">Fijo semanal</option>
            <option value="suelto">Suelto</option>
          </select>
          <select
            name="modalidad"
            className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          >
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
          </select>
        </div>
        <input
          name="link_online"
          placeholder="Link de videollamada (si es online)"
          className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
        />
        <Button type="submit" variant="primary" className="justify-self-start">
          Agendar turno
        </Button>
      </form>

      <div className="mt-4 grid gap-2">
        {turnos?.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm text-sm"
          >
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
        {!turnos?.length && (
          <p className="text-sm text-foreground/60">Sin turnos cargados todavía.</p>
        )}
      </div>

      <DocumentosPaciente pacienteId={id} documentos={documentosConUrl} />
    </div>
  );
}
