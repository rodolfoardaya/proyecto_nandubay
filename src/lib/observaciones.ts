import type { Seccion, DatosFicha, Campo } from "./ficha-fields";

// Lee, para cada campo de las secciones dadas, el par respuesta/observación
// enviado por un <form>: el valor viaja en el input `key` y su observación
// en `${key}__obs`.
export function parseDatosFicha(formData: FormData, secciones: Seccion[]): DatosFicha {
  const datos: DatosFicha = {};
  for (const seccion of secciones) {
    for (const campo of seccion.campos) {
      const valor = String(formData.get(campo.key) || "").trim();
      const observacion = String(formData.get(`${campo.key}__obs`) || "").trim();
      if (valor || observacion) datos[campo.key] = { valor, observacion };
    }
  }
  return datos;
}

// Idem, para listas planas de campos (ej. los ítems del acuerdo
// terapéutico, que no están agrupados en secciones).
export function parseObservaciones(formData: FormData, campos: Campo[]): Record<string, string> {
  const observaciones: Record<string, string> = {};
  for (const campo of campos) {
    const observacion = String(formData.get(`${campo.key}__obs`) || "").trim();
    if (observacion) observaciones[campo.key] = observacion;
  }
  return observaciones;
}
