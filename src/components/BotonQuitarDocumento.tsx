"use client";

import { useFormStatus } from "react-dom";
import { archivarDocumentoPaciente } from "@/app/panel/to/pacientes/actions";

function Boton({ titulo }: { titulo: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-semibold text-foreground/45 hover:text-orange hover:underline"
      onClick={(e) => {
        // Se pregunta antes de hacerlo. El botón anterior decía "Archivar" y
        // se entendía como guardar el documento en el archivo del paciente,
        // que es lo que uno quiere hacer justo después de subirlo: se cargaba
        // un estudio y acto seguido se lo sacaba de la lista sin querer.
        const seguro = window.confirm(
          `¿Quitar "${titulo}" de la lista?\n\n` +
            "El documento no se borra: queda guardado y lo podés volver a " +
            "mostrar desde «Documentos quitados de la lista»."
        );
        if (!seguro) e.preventDefault();
      }}
    >
      {pending ? "Quitando..." : "Quitar de la lista"}
    </button>
  );
}

export function BotonQuitarDocumento({
  documentoId,
  pacienteId,
  titulo,
}: {
  documentoId: string;
  pacienteId: string;
  titulo: string;
}) {
  return (
    <form action={archivarDocumentoPaciente}>
      <input type="hidden" name="documento_id" value={documentoId} />
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <Boton titulo={titulo} />
    </form>
  );
}
