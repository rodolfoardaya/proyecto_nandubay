"use client";

import { useEffect, useRef } from "react";

// Cierra una ventana modal cuando la acción terminó bien.
//
// Parece de más, pero no lo es: `useActionState` conserva el resultado del
// último envío, así que cerrar mirando `estado.ok` en cada render cierra la
// ventana también la próxima vez que se abre. Con eso, después de crear una
// tarea el botón "+ Nueva" dejaba de funcionar.
//
// Acá se recuerda qué resultado ya se atendió y se cierra una sola vez por
// guardado.
export function useCerrarAlGuardar(
  estado: { ok: boolean } | null,
  cerrar: () => void
) {
  const atendido = useRef<unknown>(null);

  useEffect(() => {
    if (estado?.ok && estado !== atendido.current) {
      atendido.current = estado;
      cerrar();
    }
  }, [estado, cerrar]);
}
