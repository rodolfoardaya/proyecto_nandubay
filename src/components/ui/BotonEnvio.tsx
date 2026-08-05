"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";

// Botón de envío que se deshabilita solo mientras el formulario está en curso.
//
// Sin esto, un doble clic manda el formulario dos veces y se crean dos
// registros: pasó con un alta de paciente, que quedó cargada por duplicado.
export function BotonEnvio({
  children,
  enCurso = "Guardando...",
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  enCurso?: string;
  variant?: "primary" | "secondary" | "cta";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? enCurso : children}
    </Button>
  );
}
