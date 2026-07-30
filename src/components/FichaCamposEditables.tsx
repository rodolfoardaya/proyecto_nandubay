"use client";

import { useState } from "react";
import { CamposFicha } from "@/components/CamposFicha";
import type { DatosFicha, Seccion } from "@/lib/ficha-fields";

// Envoltorio con estado para editar una ficha ya guardada: el <form> y la
// acción viven en la página (componente de servidor), y esto solo maneja lo
// que la TO va tipeando y marcando.
export function FichaCamposEditables({
  secciones,
  datosIniciales,
}: {
  secciones: Seccion[];
  datosIniciales: DatosFicha;
}) {
  const [datos, setDatos] = useState<DatosFicha>(datosIniciales);

  function actualizar(key: string, cambio: Partial<{ valor: string; observacion: string }>) {
    setDatos((prev) => ({
      ...prev,
      [key]: {
        valor: prev[key]?.valor ?? "",
        observacion: prev[key]?.observacion ?? "",
        ...cambio,
      },
    }));
  }

  return (
    <CamposFicha
      secciones={secciones}
      datos={datos}
      onValor={(key, valor) => actualizar(key, { valor })}
      onObservacion={(key, observacion) => actualizar(key, { observacion })}
    />
  );
}
