"use client";

import { SEPARADOR_MULTI, type Campo, type DatosFicha, type Seccion } from "@/lib/ficha-fields";

// Renderiza los ítems de una planilla respetando el tipo de cada uno en la
// versión en papel: campos de una línea, párrafos libres, opciones a marcar
// (una sola) y opciones a marcar (varias). Cada ítem lleva además su campo
// de observación, para aclaraciones de la TO.
//
// Los ítems de opción viajan al servidor por un input oculto con el nombre
// del campo, así `parseDatosFicha` los lee igual que a los de texto.

type Props = {
  secciones: Seccion[];
  datos: DatosFicha;
  onValor: (key: string, valor: string) => void;
  onObservacion: (key: string, observacion: string) => void;
};

const INPUT =
  "mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm font-normal text-foreground outline-blue-mid";

function marcadas(valor: string): string[] {
  return valor
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function ItemCampo({
  campo,
  valor,
  observacion,
  onValor,
  onObservacion,
}: {
  campo: Campo;
  valor: string;
  observacion: string;
  onValor: (valor: string) => void;
  onObservacion: (observacion: string) => void;
}) {
  const tipo = campo.tipo ?? "textarea";
  const seleccionadas = tipo === "multi" ? marcadas(valor) : [];

  function toggleMulti(opcion: string) {
    const proximas = seleccionadas.includes(opcion)
      ? seleccionadas.filter((o) => o !== opcion)
      : [...seleccionadas, opcion];
    // Se guardan en el orden en que están impresas en la planilla.
    const ordenadas = (campo.opciones ?? []).filter((o) => proximas.includes(o));
    onValor(ordenadas.join(SEPARADOR_MULTI));
  }

  return (
    <div className="grid gap-1">
      {campo.subtitulo && (
        <p className="mt-2 text-sm font-bold text-foreground/80">{campo.subtitulo}:</p>
      )}

      {tipo === "texto" && (
        <label className="text-xs font-semibold text-foreground/70">
          {campo.label}
          <input
            name={campo.key}
            value={valor}
            onChange={(e) => onValor(e.target.value)}
            className={INPUT}
          />
        </label>
      )}

      {tipo === "textarea" && (
        <label className="text-xs font-semibold text-foreground/70">
          {campo.label}
          <textarea
            name={campo.key}
            rows={2}
            value={valor}
            onChange={(e) => onValor(e.target.value)}
            className={INPUT}
          />
        </label>
      )}

      {(tipo === "opcion" || tipo === "multi") && (
        <fieldset>
          <legend className="text-xs font-semibold text-foreground/70">{campo.label}</legend>
          <input type="hidden" name={campo.key} value={valor} />
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {(campo.opciones ?? []).map((opcion) => (
              <label
                key={opcion}
                className="flex items-center gap-1.5 text-sm font-normal text-foreground"
              >
                <input
                  type={tipo === "opcion" ? "radio" : "checkbox"}
                  name={`${campo.key}__opt`}
                  value={opcion}
                  checked={tipo === "opcion" ? valor === opcion : seleccionadas.includes(opcion)}
                  onChange={() =>
                    tipo === "opcion"
                      ? onValor(valor === opcion ? "" : opcion)
                      : toggleMulti(opcion)
                  }
                />
                {opcion}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {!campo.sinObservacion && (
        <label className="text-xs font-semibold text-foreground/50">
          Observaciones
          <input
            name={`${campo.key}__obs`}
            value={observacion}
            onChange={(e) => onObservacion(e.target.value)}
            placeholder="Aclaraciones sobre este ítem (opcional)"
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-xs font-normal text-foreground outline-blue-mid"
          />
        </label>
      )}
    </div>
  );
}

export function CamposFicha({ secciones, datos, onValor, onObservacion }: Props) {
  return (
    <>
      {secciones.map((seccion) => (
        <section key={seccion.titulo} className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <p className="font-bold text-green-dark">{seccion.titulo}</p>
            {seccion.nota && (
              <p className="text-xs text-foreground/50">({seccion.nota})</p>
            )}
          </div>
          {seccion.campos.map((campo) => (
            <ItemCampo
              key={campo.key}
              campo={campo}
              valor={datos[campo.key]?.valor ?? ""}
              observacion={datos[campo.key]?.observacion ?? ""}
              onValor={(valor) => onValor(campo.key, valor)}
              onObservacion={(obs) => onObservacion(campo.key, obs)}
            />
          ))}
        </section>
      ))}
    </>
  );
}
