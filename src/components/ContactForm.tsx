"use client";

import { useState, FormEvent } from "react";
import { Button } from "./ui/Button";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: conectar con contacto_formulario (Supabase) cuando esté disponible el backend.
    setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded-xl bg-green-light/40 p-6 text-center font-semibold text-green-dark">
        ¡Gracias por escribirnos! Te vamos a responder a la brevedad.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
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
      <Button type="submit" variant="cta" className="justify-self-start">
        Enviar consulta
      </Button>
    </form>
  );
}
