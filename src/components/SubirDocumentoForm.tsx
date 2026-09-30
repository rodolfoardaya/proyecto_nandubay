"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { MAXIMO_ARCHIVO_MB, excedeElMaximo, mensajeArchivoGrande } from "@/lib/archivos";
import {
  subirDocumentoPaciente,
  type EstadoDocumento,
} from "@/app/panel/to/pacientes/actions";

const CAMPO = "rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-blue-mid";

const TIPOS = [
  { valor: "estudio", label: "Estudio" },
  { valor: "informe", label: "Informe de otro profesional" },
  { valor: "certificado", label: "Certificado" },
  { valor: "derivacion", label: "Derivación" },
  { valor: "otro", label: "Otro" },
];

function BotonCargar({ bloqueado }: { bloqueado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      className="justify-self-start"
      disabled={pending || bloqueado}
    >
      {pending ? "Subiendo..." : "Cargar documento"}
    </Button>
  );
}

export function SubirDocumentoForm({ pacienteId }: { pacienteId: string }) {
  const [estado, accion] = useActionState<EstadoDocumento, FormData>(
    subirDocumentoPaciente,
    null
  );
  // El peso se controla acá también, antes de subir: avisar en el momento es
  // mejor que esperar a que viajen quince megabytes para recién enterarse.
  const [pesado, setPesado] = useState<string | null>(null);

  return (
    <form action={accion} className="mt-3 grid max-w-lg gap-3">
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <input
        required
        name="titulo"
        placeholder="Título (ej. Audiometría, Informe neurológico)"
        className={CAMPO}
      />
      <select name="tipo" className={CAMPO}>
        {TIPOS.map((t) => (
          <option key={t.valor} value={t.valor}>
            {t.label}
          </option>
        ))}
      </select>
      <input name="descripcion" placeholder="Aclaración (opcional)" className={CAMPO} />
      <input
        required
        type="file"
        name="archivo"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className={CAMPO}
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          setPesado(
            archivo && excedeElMaximo(archivo.size) ? mensajeArchivoGrande(archivo.size) : null
          );
        }}
      />
      <p className="text-xs text-foreground/50">
        PDF o foto, hasta {MAXIMO_ARCHIVO_MB} MB. Queda guardado en la historia
        clínica del paciente.
      </p>

      {pesado && <p className="text-sm font-semibold text-orange">{pesado}</p>}
      {estado && !pesado && (
        <p
          className={`text-sm font-semibold ${
            estado.ok ? "text-green-mid" : "text-orange"
          }`}
        >
          {estado.mensaje}
        </p>
      )}

      <BotonCargar bloqueado={pesado !== null} />
    </form>
  );
}
