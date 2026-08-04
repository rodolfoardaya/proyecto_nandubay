import { Button } from "@/components/ui/Button";
import {
  subirDocumentoPaciente,
  archivarDocumentoPaciente,
} from "@/app/panel/to/pacientes/actions";

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

const TIPOS = [
  { valor: "estudio", label: "Estudio" },
  { valor: "informe", label: "Informe de otro profesional" },
  { valor: "certificado", label: "Certificado" },
  { valor: "derivacion", label: "Derivación" },
  { valor: "otro", label: "Otro" },
];

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
  soloLectura = false,
}: {
  pacienteId: string;
  documentos: DocumentoPaciente[];
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
                  <form action={archivarDocumentoPaciente}>
                    <input type="hidden" name="documento_id" value={d.id} />
                    <input type="hidden" name="paciente_id" value={pacienteId} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-orange hover:underline"
                    >
                      Archivar
                    </button>
                  </form>
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
          <form action={subirDocumentoPaciente} className="mt-3 grid max-w-lg gap-3">
            <input type="hidden" name="paciente_id" value={pacienteId} />
            <input
              required
              name="titulo"
              placeholder="Título (ej. Audiometría, Informe neurológico)"
              className="rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-blue-mid"
            />
            <select
              name="tipo"
              className="rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-blue-mid"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              name="descripcion"
              placeholder="Aclaración (opcional)"
              className="rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-blue-mid"
            />
            <input
              required
              type="file"
              name="archivo"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="rounded-xl border border-black/10 px-4 py-2.5 text-sm"
            />
            <p className="text-xs text-foreground/50">
              PDF o foto. Queda guardado en la historia clínica del paciente.
            </p>
            <Button type="submit" variant="secondary" className="justify-self-start">
              Cargar documento
            </Button>
          </form>
        </details>
      )}
    </section>
  );
}
