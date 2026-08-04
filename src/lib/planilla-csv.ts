// Planilla tipo para dar de alta un paciente sin tipear campo por campo.
//
// El sistema entrega un CSV con un renglón por ítem de la ficha; alguien lo
// completa (una persona en Excel, o un agente de IA leyendo el escaneo) y lo
// vuelve a subir. Al leerlo NO interviene ninguna IA: se buscan las claves
// exactas, así que lo que se carga es literalmente lo que dice el archivo.
//
// Se emite con separador `;` y BOM porque es lo que Excel en español abre
// derecho; al leer se detecta el separador solo, para aceptar también los
// archivos que genere otra herramienta con comas.

import {
  SECCIONES_NINOS,
  SECCIONES_ADULTOS,
  CAMPOS_ACUERDO,
  SEPARADOR_MULTI,
  keyDeOpcion,
  type Campo,
  type DatosFicha,
} from "./ficha-fields";

export const COLUMNAS = ["clave", "seccion", "campo", "tipo", "opciones_validas", "VALOR", "OBSERVACION"];

// Datos que no viven en la ficha sino en la fila del paciente.
const IDENTIDAD: { clave: string; campo: string; tipo: string; ayuda?: string }[] = [
  { clave: "apellido", campo: "Apellido", tipo: "texto" },
  { clave: "nombre", campo: "Nombre", tipo: "texto" },
  { clave: "dni", campo: "DNI", tipo: "texto", ayuda: "sin puntos" },
  { clave: "fecha_nacimiento", campo: "Fecha de nacimiento", tipo: "fecha", ayuda: "AAAA-MM-DD" },
];

function escapar(valor: string, sep: string) {
  const s = valor ?? "";
  return s.includes(sep) || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function filasDeCampo(campo: Campo, seccion: string): string[][] {
  const tipo = campo.tipo ?? "textarea";

  // Los ítems donde cada opción lleva su propia aclaración se abren en un
  // renglón por opción: así se marca y se comenta cada una por separado.
  if (campo.observacionPorOpcion && campo.opciones) {
    return campo.opciones.map((opcion) => [
      keyDeOpcion(campo.key, opcion),
      seccion,
      `${campo.label} — ${opcion}`,
      "marca",
      "SI o vacio",
      "",
      "",
    ]);
  }

  const opciones = campo.opciones
    ? tipo === "multi"
      ? `varias de: ${campo.opciones.join(" | ")}`
      : `una de: ${campo.opciones.join(" | ")}`
    : "";

  return [[campo.key, seccion, campo.label, tipo, opciones, "", ""]];
}

export function generarPlanillaCsv(tipo: "nino" | "adulto"): string {
  const secciones = tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  const sep = ";";
  const filas: string[][] = [];

  for (const d of IDENTIDAD) {
    filas.push([d.clave, "Paciente", d.campo, d.tipo, d.ayuda ?? "", "", ""]);
  }

  for (const seccion of secciones) {
    for (const campo of seccion.campos) {
      filas.push(...filasDeCampo(campo, seccion.titulo));
    }
  }

  for (const campo of CAMPOS_ACUERDO) {
    const ayuda =
      campo.key === "modalidad"
        ? "presencial o online"
        : campo.key === "autoriza_imagenes"
          ? "SI o NO"
          : campo.key === "valor_sesion" || campo.key === "duracion_sesion_minutos"
            ? "solo numeros"
            : "";
    filas.push([campo.key, "Acuerdo terapéutico", campo.label, "texto", ayuda, "", ""]);
  }

  const cual = tipo === "adulto" ? "ADULTOS" : "NIÑOS";
  const instrucciones = [
    `PLANILLA DE ALTA DE PACIENTE — ${cual}`,
    "",
    "COMO COMPLETARLA",
    "1. Llená únicamente las columnas VALOR y OBSERVACION (las dos últimas).",
    "2. No modifiques ni borres las otras columnas, ni agregues o quites renglones.",
    "3. Dejá vacío lo que no sepas o no corresponda. No inventes datos.",
    "4. No hace falta escribir en mayúsculas: el sistema las convierte solo.",
    "",
    "SEGUN LO QUE DIGA LA COLUMNA opciones_validas",
    'Si dice "una de: A | B | C"  →  escribí UNA sola, tal cual está escrita.',
    'Si dice "varias de: A | B | C"  →  escribí las que correspondan separadas por coma.',
    'Si dice "SI o vacio"  →  escribí SI si corresponde, o dejalo vacío.',
    "Si está vacía  →  escribí texto libre.",
    "Las fechas van como AAAA-MM-DD. Por ejemplo: 1981-03-14",
    "",
    "LA COLUMNA observacion",
    "Es para aclaraciones sobre ese ítem puntual (letra dudosa, dato a confirmar).",
    "Es opcional y puede quedar vacía.",
    "",
    "AL GUARDAR",
    'Desde Excel: Archivo → Guardar como → tipo "CSV UTF-8 (delimitado por comas)".',
    "",
    "IMPORTANTE",
    "La primera columna (clave) la usa el sistema para saber a qué dato",
    "corresponde cada renglón. Si se modifica o se borra, el archivo deja de",
    "poder leerse. No la toques.",
    "",
    "Los datos empiezan en el renglón de abajo.",
    "",
  ].map((l) => escapar(l, sep));

  const lineas = [
    `sep=${sep}`,
    ...instrucciones,
    COLUMNAS.join(sep),
    ...filas.map((f) => f.map((c) => escapar(c, sep)).join(sep)),
  ];

  // El BOM es lo que hace que Excel muestre bien los acentos y la ñ.
  return "﻿" + lineas.join("\r\n") + "\r\n";
}

// ── Lectura ────────────────────────────────────────────────────────────────

function partirLinea(linea: string, sep: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let entreComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (entreComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        actual += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === sep) {
      celdas.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  celdas.push(actual);
  return celdas;
}

export type PlanillaLeida = {
  paciente: { apellido: string; nombre: string; dni: string; fecha_nacimiento: string };
  datos: DatosFicha;
  acuerdo: Record<string, string>;
  camposLeidos: number;
  clavesDesconocidas: string[];
};

export function leerPlanillaCsv(texto: string, tipo: "nino" | "adulto"): PlanillaLeida {
  const limpio = texto.replace(/^﻿/, "");
  const lineas = limpio.split(/\r?\n/).filter((l) => l.trim() !== "");

  // Arriba del archivo van las instrucciones, así que no se puede asumir en
  // qué renglón empiezan los datos: se busca la fila de encabezados, que es
  // la única que arranca con "clave".
  const idxCabecera = lineas.findIndex((l) => /^"?clave"?\s*[;,\t]/i.test(l));

  const lineaSep = lineas.find((l) => l.toLowerCase().startsWith("sep="));
  let sep: string;
  if (lineaSep) {
    sep = lineaSep.slice(4).trim() || ";";
  } else {
    // Sin la marca de Excel, se deduce del propio encabezado.
    const cabecera = idxCabecera >= 0 ? lineas[idxCabecera] : (lineas[0] ?? "");
    sep = (cabecera.match(/;/g)?.length ?? 0) >= (cabecera.match(/,/g)?.length ?? 0) ? ";" : ",";
  }

  const inicio = idxCabecera >= 0 ? idxCabecera + 1 : 0;

  const secciones = tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
  const validas = new Set<string>();
  for (const s of secciones) {
    for (const c of s.campos) {
      validas.add(c.key);
      if (c.observacionPorOpcion && c.opciones) {
        for (const o of c.opciones) validas.add(keyDeOpcion(c.key, o));
      }
    }
  }
  const clavesAcuerdo = new Set(CAMPOS_ACUERDO.map((c) => c.key));
  const clavesIdentidad = new Set(IDENTIDAD.map((d) => d.clave));

  const paciente = { apellido: "", nombre: "", dni: "", fecha_nacimiento: "" };
  const datos: DatosFicha = {};
  const acuerdo: Record<string, string> = {};
  const clavesDesconocidas: string[] = [];
  let camposLeidos = 0;

  for (let i = inicio; i < lineas.length; i++) {
    const celdas = partirLinea(lineas[i], sep);
    const clave = (celdas[0] ?? "").trim();
    if (!clave) continue;

    const valor = (celdas[5] ?? "").trim();
    const observacion = (celdas[6] ?? "").trim();
    if (!valor && !observacion) continue;

    if (clavesIdentidad.has(clave)) {
      if (clave === "fecha_nacimiento") paciente.fecha_nacimiento = valor;
      else paciente[clave as "apellido" | "nombre" | "dni"] = valor.toUpperCase();
      camposLeidos++;
    } else if (clavesAcuerdo.has(clave)) {
      acuerdo[clave] = valor;
      camposLeidos++;
    } else if (validas.has(clave)) {
      datos[clave] = { valor: valor.toUpperCase(), observacion: observacion.toUpperCase() };
      camposLeidos++;
    } else {
      clavesDesconocidas.push(clave);
    }
  }

  return { paciente, datos, acuerdo, camposLeidos, clavesDesconocidas };
}

export { SEPARADOR_MULTI };
