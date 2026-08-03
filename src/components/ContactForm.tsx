"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui/Button";
import { enviarConsulta, type EstadoConsulta } from "@/app/actions";

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="cta" className="justify-self-start" disabled={pending}>
      {pending ? "Enviando..." : "Enviar consulta"}
    </Button>
  );
}

export function ContactForm() {
  const [estado, accion] = useActionState<EstadoConsulta, FormData>(enviarConsulta, null);

  if (estado?.ok) {
    return (
      <p className="rounded-xl bg-green-light/40 p-6 text-center font-semibold text-green-dark">
        {estado.mensaje}
      </p>
    );
  }

  return (
    <form action={accion} className="grid gap-4">
      <input
        required
        name="nombre"
        placeholder="Nombre y apellido"
        className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          required
          type="email"
          name="email"
          placeholder="Email"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
        />
        <input
          required
          name="telefono"
          placeholder="Teléfono"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
        />
      </div>
      <input
        name="motivo"
        placeholder="Motivo de consulta"
        className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
      />
      <textarea
        name="mensaje"
        placeholder="Mensaje"
        rows={4}
        className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
      />

      {estado && !estado.ok && (
        <p className="text-sm font-semibold text-orange">{estado.mensaje}</p>
      )}

      <BotonEnviar />
    </form>
  );
}
