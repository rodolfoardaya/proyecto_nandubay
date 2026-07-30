"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FirmaPad } from "@/components/FirmaPad";
import { AcuerdoTerapeuticoCampos, type ValoresAcuerdo } from "@/components/AcuerdoTerapeuticoCampos";

type Props = {
  action: (formData: FormData) => void;
  pacienteId: string;
  acuerdoId?: string;
  tipo: "nino" | "adulto";
  valoresIniciales: ValoresAcuerdo;
  firmaActualUrl?: string | null;
  archivoAdjuntoUrl?: string | null;
  etiquetaSubmit: string;
};

// Formulario completo del acuerdo terapéutico (alta o edición): subir/leer
// la planilla con IA, revisar valor/duración/modalidad/autorización con su
// observación por ítem, firmar y guardar.
export function AcuerdoTerapeuticoForm({
  action,
  pacienteId,
  acuerdoId,
  tipo,
  valoresIniciales,
  firmaActualUrl,
  archivoAdjuntoUrl,
  etiquetaSubmit,
}: Props) {
  const [valores, setValores] = useState<ValoresAcuerdo>(valoresIniciales);

  return (
    <form action={action} className="mt-3 grid max-w-md gap-3 rounded-2xl bg-white p-5 shadow-sm">
      <input type="hidden" name="paciente_id" value={pacienteId} />
      {acuerdoId && <input type="hidden" name="acuerdo_id" value={acuerdoId} />}
      <AcuerdoTerapeuticoCampos
        tipo={tipo}
        valores={valores}
        onValoresChange={setValores}
        archivoAdjuntoUrl={archivoAdjuntoUrl}
      />
      <FirmaPad name="firma" firmaActualUrl={firmaActualUrl} />
      <Button type="submit" variant="primary" className="justify-self-start">
        {etiquetaSubmit}
      </Button>
    </form>
  );
}
