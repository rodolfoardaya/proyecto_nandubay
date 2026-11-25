"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { enlaceWhatsapp, telefonoLegible } from "@/lib/whatsapp-enlace";

// Una fila de la lista de avisos: el mensaje propuesto, editable, y el botón
// que abre WhatsApp con todo cargado.
//
// El mensaje no se manda desde el servidor. Se abre el WhatsApp del
// consultorio con el contacto y el texto puestos, y la persona aprieta
// enviar: así sale del número de Ñandubay y se puede corregir antes.
export function AvisoWhatsapp({
  titulo,
  subtitulo,
  telefono,
  mensajeInicial,
  avisado,
  children,
}: {
  titulo: string;
  subtitulo: string;
  telefono: string | null;
  mensajeInicial: string;
  avisado: boolean;
  // Los formularios de "marcar como enviado" y "volver a pendiente", que son
  // acciones de servidor y llegan desde la página.
  children: React.ReactNode;
}) {
  const [mensaje, setMensaje] = useState(mensajeInicial);
  const [abierto, setAbierto] = useState(false);

  return (
    <li
      className={`rounded-2xl bg-white p-4 shadow-sm ${
        avisado ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-48 flex-1">
          <p className="font-semibold text-green-dark">{titulo}</p>
          <p className="text-sm text-foreground/60">{subtitulo}</p>
          <p className="mt-0.5 text-xs text-foreground/50">
            {telefono ? (
              telefonoLegible(telefono)
            ) : (
              <span className="font-bold text-orange">
                Sin teléfono válido — cargalo en los datos del paciente
              </span>
            )}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {avisado ? (
            <span className="rounded-full bg-green-light/50 px-3 py-1 text-xs font-bold text-green-dark">
              Ya avisado
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-blue-mid hover:bg-blue-light/20"
              >
                {abierto ? "Ocultar mensaje" : "Ver y editar mensaje"}
              </button>
              {telefono && (
                <a
                  href={enlaceWhatsapp(telefono, mensaje)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button type="button" variant="primary">
                    Abrir en WhatsApp
                  </Button>
                </a>
              )}
            </>
          )}
          {children}
        </div>
      </div>

      {abierto && !avisado && (
        <div className="mt-3">
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
          />
          <p className="mt-1 text-xs text-foreground/50">
            Lo que edites acá es lo que va a aparecer en WhatsApp. Igual vas a
            poder revisarlo allá antes de enviarlo.
          </p>
        </div>
      )}
    </li>
  );
}
