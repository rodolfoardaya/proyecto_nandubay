"use client";

import { useState } from "react";

export function ResetearClaveButton({ usuarioId }: { usuarioId: string }) {
  const [clave, setClave] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resetear() {
    if (!confirm("¿Resetear la clave de esta TO? La clave anterior deja de funcionar.")) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reset-clave-to", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo resetear la clave.");
        return;
      }
      setClave(data.clave);
    } catch {
      setError("No se pudo resetear la clave.");
    } finally {
      setCargando(false);
    }
  }

  if (clave) {
    return (
      <p className="mt-2 rounded-lg bg-yellow-soft/40 px-3 py-2 text-xs font-semibold text-[#8a6400]">
        Nueva clave: <span className="font-mono">{clave}</span> — copiala ahora, no se vuelve a mostrar.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={resetear}
        disabled={cargando}
        className="text-xs font-semibold text-orange hover:underline disabled:opacity-50"
      >
        {cargando ? "Reseteando..." : "Resetear clave"}
      </button>
      {error && <p className="mt-1 text-xs text-orange">{error}</p>}
    </div>
  );
}
