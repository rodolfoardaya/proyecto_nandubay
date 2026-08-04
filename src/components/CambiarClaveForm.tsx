"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/PasswordInput";
import { cambiarMiClave, type EstadoClave } from "@/app/panel/cuenta/actions";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" className="justify-self-start" disabled={pending}>
      {pending ? "Guardando..." : "Cambiar mi clave"}
    </Button>
  );
}

export function CambiarClaveForm() {
  const [estado, accion] = useActionState<EstadoClave, FormData>(cambiarMiClave, null);

  return (
    <form action={accion} className="grid max-w-sm gap-4">
      <label className="grid gap-1 text-sm font-semibold text-foreground/70">
        Clave actual
        <PasswordInput name="actual" placeholder="Tu clave de ahora" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-foreground/70">
        Clave nueva
        <PasswordInput name="nueva" placeholder="Al menos 8 caracteres" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-foreground/70">
        Repetir la clave nueva
        <PasswordInput name="repetida" placeholder="La misma otra vez" />
      </label>

      {estado && (
        <p
          className={`text-sm font-semibold ${estado.ok ? "text-green-mid" : "text-orange"}`}
        >
          {estado.mensaje}
        </p>
      )}

      <BotonGuardar />
    </form>
  );
}
