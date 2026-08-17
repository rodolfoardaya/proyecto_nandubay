"use client";

import { useFormStatus } from "react-dom";

// Botón de envío para acciones que no se pueden deshacer: pide confirmación
// antes de mandar el formulario, y se deshabilita mientras está en curso.
//
// Va como enlace de texto, no como botón grande, para que una acción
// destructiva no compita visualmente con las de uso diario.
export function BotonConfirmar({
  children,
  confirmacion,
  enCurso = "Borrando...",
  className,
}: {
  children: React.ReactNode;
  confirmacion: string;
  enCurso?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(e) => {
        if (!confirm(confirmacion)) e.preventDefault();
      }}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? enCurso : children}
    </button>
  );
}
