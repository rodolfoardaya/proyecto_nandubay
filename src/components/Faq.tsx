"use client";

import { useState } from "react";

const faqs = [
  {
    q: "¿Qué es la Terapia Ocupacional?",
    a: "Es un acompañamiento que busca potenciar la autonomía, el bienestar y la participación de cada persona en su vida cotidiana, a través de intervenciones personalizadas.",
  },
  {
    q: "¿Atienden niños y adultos?",
    a: "Sí. Trabajamos con niños y jóvenes (integración sensorial, motricidad, vida diaria) y con adultos (rehabilitación y estimulación cognitiva, organización de rutinas).",
  },
  {
    q: "¿Ofrecen atención online?",
    a: "Sí, además de la atención presencial en nuestro consultorio de San Miguel de Tucumán, ofrecemos sesiones online.",
  },
  {
    q: "¿Cómo se solicita un turno?",
    a: "Podés escribirnos por WhatsApp o completar el formulario de contacto y te respondemos para coordinar una primera entrevista.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-black/10">
      {faqs.map((item, i) => (
        <div key={item.q} className="py-4">
          <button
            className="flex w-full items-center justify-between text-left font-bold text-green-dark"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {item.q}
            <span className="ml-4 text-xl">{open === i ? "−" : "+"}</span>
          </button>
          {open === i && (
            <p className="mt-2 text-sm text-foreground/80">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}
