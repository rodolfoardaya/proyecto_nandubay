import { SubirDocumentoForm } from "@/components/SubirDocumentoForm";
import { BotonQuitarDocumento } from "@/components/BotonQuitarDocumento";
import { restaurarDocumentoPaciente } from "@/app/panel/to/pacientes/actions";

export type DocumentoPaciente = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  nombre_original: string | null;
  tamano_bytes: number | null;
  created_at: string;
  url: string | null;
};

function pesoLegible(bytes: number | null) {
  if (!bytes) return null;
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Documentos sueltos del paciente. La ficha de inicio y el acuerdo tienen su
// propio adjunto; acá van estudios, informes y todo lo que llegue después.
export function DocumentosPaciente({
  pacienteId,
  documentos,
  quitados = [],
  soloLectura = false,
}: {
  pacienteId: string;
  documentos: DocumentoPaciente[];
  quitados?: DocumentoPaciente[];
  soloLectura?: boolean;
}) {
  return (
    <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-bold text-green-dark">Estudios y documentos</h2>

      {documentos.length === 0 ? (
        <p className="mt-2 text-sm text-foreground/60">
          Todavía no hay estudios ni informes cargados.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-black/5">
          {documentos.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
              <span className="rounded-full bg-blue-light/30 px-2 py-0.5 text-xs font-bold capitalize text-blue-mid">
                {d.tipo}
              </span>
              <span className="font-semibold text-green-dark">{d.titulo}</span>
              {d.descripcion && (
                <span className="text-xs italic text-foreground/60">{d.descripcion}</span>
              )}
              <span className="text-xs text-foreground/50">
                {new Date(d.created_at).toLocaleDateString("es-AR")}
                {pesoLegible(d.tamano_bytes) ? ` · ${pesoLegible(d.tamano_bytes)}` : ""}
              </span>

              <span className="ml-auto flex items-center gap-3">
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-mid hover:underline"
                  >
                    Ver
                  </a>
                )}
                {!soloLectura && (
                  <BotonQuitarDocumento
                    documentoId={d.id}
                    pacienteId={pacienteId}
                    titulo={d.titulo}
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!soloLectura && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-blue-mid">
            Cargar un estudio o documento
          </summary>
          <SubirDocumentoForm pacienteId={pacienteId} />
        </details>
      )}

      {/* Lo quitado no se borra —es historia clínica— y desde acá se vuelve a
          mostrar. Sin esta sección, sacar un documento de la lista parecía
          perderlo para siempre. */}
      {!soloLectura && quitados.length > 0 && (
        <details className="mt-4 border-t border-black/5 pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground/50">
            Documentos quitados de la lista ({quitados.length})
          </summary>
          <ul className="mt-2 divide-y divide-black/5">
            {quitados.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="font-semibold text-foreground/60">{d.titulo}</span>
                <span className="text-xs text-foreground/40">
                  {new Date(d.created_at).toLocaleDateString("es-AR")}
                  {pesoLegible(d.tamano_bytes) ? ` · ${pesoLegible(d.tamano_bytes)}` : ""}
                </span>
                <form action={restaurarDocumentoPaciente} className="ml-auto">
                  <input type="hidden" name="documento_id" value={d.id} />
                  <input type="hidden" name="paciente_id" value={pacienteId} />
                  <button type="submit" className="text-xs font-bold text-green-mid hover:underline">
                    Volver a mostrar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
