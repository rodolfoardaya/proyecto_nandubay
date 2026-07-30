"use client";

import { useState } from "react";
import { CAMPOS_ACUERDO } from "@/lib/ficha-fields";

export type ValoresAcuerdo = {
  valor_sesion: string;
  forma_pago: string;
  duracion_sesion_minutos: string;
  modalidad: string;
  autoriza_imagenes: boolean;
};

type Props = {
  tipo: "nino" | "adulto";
  valores: ValoresAcuerdo;
  onValoresChange: (valores: ValoresAcuerdo) => void;
  archivoAdjuntoUrl?: string | null;
};

// Campos del acuerdo terapéutico (valor de sesión, duración, modalidad,
// autorización de imágenes) con un botón para leerlos automáticamente de
// un PDF o foto de la planilla, y un campo de observación por ítem.
export function AcuerdoTerapeuticoCampos({
  tipo,
  valores,
  onValoresChange,
  archivoAdjuntoUrl,
}: Props) {
  const [leyendo, setLeyendo] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [leido, setLeido] = useState(false);

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setLeyendo(true);
    setOcrError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("tipo", tipo);
      const res = await fetch("/api/ocr-acuerdo", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setOcrError(
          res.status === 501
            ? "Lectura automática no configurada — completá los datos a mano."
            : "No se pudo leer el archivo — completá o corregí los datos a mano."
        );
        return;
      }

      onValoresChange({
        valor_sesion: data.valor_sesion ? String(data.valor_sesion) : "",
        forma_pago: data.forma_pago || "",
        duracion_sesion_minutos: data.duracion_sesion_minutos ? String(data.duracion_sesion_minutos) : "45",
        modalidad: data.modalidad === "online" ? "online" : "presencial",
        autoriza_imagenes: !!data.autoriza_imagenes,
      });
      setLeido(true);
    } catch {
      setOcrError("No se pudo leer el archivo — completá o corregí los datos a mano.");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <input
          type="file"
          name="archivo_acuerdo"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleArchivo}
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
        />
        <p className="text-xs text-foreground/50">
          Subí el PDF o una foto de la planilla de acuerdo terapéutico firmada en papel para leerla con IA.
        </p>
        {leyendo && <p className="text-sm text-blue-mid">Leyendo con IA...</p>}
        {ocrError && <p className="text-sm text-orange">{ocrError}</p>}
        {leido && !leyendo && (
          <p className="text-sm font-semibold text-green-dark">
            Datos leídos — revisalos abajo y corregí lo que haga falta.
          </p>
        )}
        {archivoAdjuntoUrl && (
          <a href={archivoAdjuntoUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-mid hover:underline">
            Ver planilla adjunta
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-foreground/70">
          {CAMPOS_ACUERDO[0].label}
          <input
            type="number"
            step="0.01"
            name="valor_sesion"
            placeholder="$"
            value={valores.valor_sesion}
            onChange={(e) => onValoresChange({ ...valores, valor_sesion: e.target.value })}
            className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 outline-blue-mid font-normal"
          />
        </label>
        <label className="text-xs font-semibold text-foreground/70">
          {CAMPOS_ACUERDO[2].label}
          <input
            type="number"
            name="duracion_sesion_minutos"
            value={valores.duracion_sesion_minutos}
            onChange={(e) => onValoresChange({ ...valores, duracion_sesion_minutos: e.target.value })}
            className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 outline-blue-mid font-normal"
          />
        </label>
      </div>

      <label className="text-xs font-semibold text-foreground/70">
        {CAMPOS_ACUERDO[1].label}
        <input
          name="forma_pago"
          placeholder="Efectivo, transferencia..."
          value={valores.forma_pago}
          onChange={(e) => onValoresChange({ ...valores, forma_pago: e.target.value })}
          className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 outline-blue-mid font-normal"
        />
      </label>

      <label className="text-xs font-semibold text-foreground/70">
        {CAMPOS_ACUERDO[3].label}
        <select
          name="modalidad"
          value={valores.modalidad}
          onChange={(e) => onValoresChange({ ...valores, modalidad: e.target.value })}
          className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 outline-blue-mid font-normal"
        >
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="autoriza_imagenes"
          checked={valores.autoriza_imagenes}
          onChange={(e) => onValoresChange({ ...valores, autoriza_imagenes: e.target.checked })}
        />
        El/la tutor/a autoriza el uso de fotos/videos con fines de difusión institucional
      </label>
    </div>
  );
}
