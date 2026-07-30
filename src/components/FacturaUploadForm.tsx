"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { cargarFactura } from "@/app/panel/to/facturacion/actions";

type Paciente = { id: string; nombre: string };

export function FacturaUploadForm({ pacientes }: { pacientes: Paciente[] }) {
  const [leyendo, setLeyendo] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [campos, setCampos] = useState({
    fecha_facturacion: "",
    monto: "",
    fecha_vencimiento_estimada: "",
  });

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setLeyendo(true);
    setOcrError(null);
    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      const res = await fetch("/api/ocr-factura", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setOcrError(
          res.status === 501
            ? "Lectura automática no configurada todavía — completá los datos a mano."
            : "No se pudo leer la factura automáticamente — completá los datos a mano."
        );
        return;
      }

      setCampos({
        fecha_facturacion: data.fecha_facturacion ?? "",
        monto: data.monto != null ? String(data.monto) : "",
        fecha_vencimiento_estimada: data.fecha_vencimiento_estimada ?? "",
      });
    } catch {
      setOcrError("No se pudo leer la factura automáticamente — completá los datos a mano.");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <form
      action={cargarFactura}
      encType="multipart/form-data"
      className="mt-3 grid gap-3 rounded-2xl bg-white p-5 shadow-sm"
    >
      <select
        required
        name="paciente_id"
        defaultValue=""
        className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
      >
        <option value="" disabled>
          Paciente...
        </option>
        {pacientes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>

      <input
        required
        type="file"
        name="archivo"
        accept="application/pdf"
        onChange={handleArchivo}
        className="rounded-xl border border-black/10 bg-white px-4 py-3"
      />

      {leyendo && (
        <p className="text-sm text-blue-mid">Leyendo factura con IA...</p>
      )}
      {ocrError && <p className="text-sm text-orange">{ocrError}</p>}

      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-foreground/70">
          Fecha de facturación
          <input
            type="date"
            name="fecha_facturacion"
            value={campos.fecha_facturacion}
            onChange={(e) => setCampos({ ...campos, fecha_facturacion: e.target.value })}
            className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          />
        </label>
        <label className="text-xs font-semibold text-foreground/70">
          Monto ($)
          <input
            type="number"
            step="0.01"
            name="monto"
            value={campos.monto}
            onChange={(e) => setCampos({ ...campos, monto: e.target.value })}
            className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          />
        </label>
        <label className="text-xs font-semibold text-foreground/70">
          Vencimiento de cobro
          <input
            type="date"
            name="fecha_vencimiento_estimada"
            value={campos.fecha_vencimiento_estimada}
            onChange={(e) => setCampos({ ...campos, fecha_vencimiento_estimada: e.target.value })}
            className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          />
        </label>
      </div>
      <p className="text-xs text-foreground/50">
        Revisá los datos antes de guardar — la lectura automática puede
        equivocarse.
      </p>

      <Button type="submit" variant="primary" className="justify-self-start">
        Cargar factura
      </Button>
    </form>
  );
}
