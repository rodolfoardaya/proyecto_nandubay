// Estructura de las planillas del consultorio, transcrita ítem por ítem de
// las fichas en papel (ficha de inicio niños/adultos). Cada campo se guarda
// en la columna jsonb `fichas_inicio.datos` bajo su `key`.
//
// El nombre y apellido, el DNI y la fecha de nacimiento NO están acá: viven
// en columnas propias de `pacientes`, porque identifican la historia clínica.

export type TipoCampo = "texto" | "textarea" | "opcion" | "multi";

export type Campo = {
  key: string;
  label: string;
  // Por omisión "textarea", que es cómo se completaba antes toda la ficha.
  tipo?: TipoCampo;
  // Opciones a marcar, para tipo "opcion" (una sola) y "multi" (varias).
  opciones?: string[];
  // Sub-encabezado en negrita que precede al ítem en la planilla en papel
  // (ej. "Embarazo:", "Desarrollo motor:" dentro de Antecedentes).
  subtitulo?: string;
  // Si true, no mostrar campo de observación (para campos de texto/textarea).
  // Las observaciones solo van con selectores (opcion/multi).
  sinObservacion?: boolean;
};

export type Seccion = {
  titulo: string;
  // Aclaración que la planilla imprime bajo el título de la sección.
  nota?: string;
  campos: Campo[];
};

// Cada ítem de una planilla digitalizada guarda la respuesta leída/cargada
// y un campo de observación aparte, para que la TO deje aclaraciones
// (letra ilegible, dato a confirmar, etc.) sin pisar la respuesta. En los
// ítems de opción múltiple, `valor` guarda las opciones marcadas separadas
// por coma.
export type ItemValor = { valor: string; observacion: string };
export type DatosFicha = Record<string, ItemValor>;

export const SEPARADOR_MULTI = ", ";

// Ítems del acuerdo terapéutico que se completan a mano sobre el texto
// preimpreso del contrato (ver lib/pdf/AcuerdoDoc.tsx para el texto).
export const CAMPOS_ACUERDO: Campo[] = [
  { key: "valor_sesion", label: "Valor de sesión" },
  { key: "forma_pago", label: "Forma de pago" },
  { key: "duracion_sesion_minutos", label: "Duración de sesión (minutos)" },
  { key: "modalidad", label: "Modalidad" },
  { key: "autoriza_imagenes", label: "Autoriza uso de imágenes" },
];

export const SECCIONES_NINOS: Seccion[] = [
  {
    titulo: "1. Datos personales del niño/a",
    campos: [
      { key: "domicilio", label: "Domicilio", tipo: "texto", sinObservacion: true },
      { key: "escuela", label: "Escuela / Jardín", tipo: "texto", sinObservacion: true },
      { key: "grado_sala", label: "Grado / Sala", tipo: "texto", sinObservacion: true },
    ],
  },
  {
    titulo: "2. Datos familiares",
    campos: [
      { key: "tutor_nombre", label: "Nombre de madre/padre/tutor", tipo: "texto", sinObservacion: true },
      { key: "telefono", label: "Teléfono", tipo: "texto", sinObservacion: true },
      { key: "tutor_ocupacion", label: "Ocupación", tipo: "texto", sinObservacion: true },
      { key: "con_quien_vive", label: "Con quién vive el niño/a", tipo: "texto", sinObservacion: true },
    ],
  },
  {
    titulo: "3. Motivo de consulta",
    campos: [
      { key: "motivo_consulta", label: "¿Por qué consultan?", sinObservacion: true },
      {
        key: "quien_sugirio",
        label: "¿Quién sugirió la consulta? (familia, escuela, pediatra, etc.)",
        tipo: "texto",
        sinObservacion: true,
      },
    ],
  },
  {
    titulo: "4. Rutina diaria",
    nota: "Marcar o completar",
    campos: [
      { key: "hora_despierta", label: "Hora en que se despierta", tipo: "texto", sinObservacion: true },
      { key: "va_escuela", label: "Va a la escuela", tipo: "opcion", opciones: ["Sí", "No"] },
      { key: "siesta", label: "Siesta", tipo: "opcion", opciones: ["Sí", "No"] },
      { key: "hora_dormir", label: "Hora de dormir", tipo: "texto", sinObservacion: true },
      {
        key: "momentos_dificiles",
        label: "Momentos que suelen ser difíciles",
        tipo: "multi",
        opciones: ["Mañana", "Tarde", "Noche"],
      },
      { key: "momentos_tranquilo", label: "Momentos en que está más tranquilo/a", tipo: "texto", sinObservacion: true },
    ],
  },
  {
    titulo: "5. Uso de pantallas",
    campos: [
      { key: "usa_pantallas", label: "¿Usa pantallas?", tipo: "opcion", opciones: ["Sí", "No"] },
      {
        key: "pantallas_tiempo",
        label: "Tiempo aproximado por día",
        tipo: "opcion",
        opciones: ["Menos de 1 hora", "1–2 horas", "Más de 2 horas"],
      },
      {
        key: "pantallas_reaccion",
        label: "¿Cómo reacciona cuando se las sacan?",
        tipo: "opcion",
        opciones: ["Se enoja", "Llora", "Lo acepta", "Otro"],
      },
    ],
  },
  {
    titulo: "6. En casa",
    campos: [
      {
        key: "limites",
        label: "Para poner límites generalmente",
        tipo: "opcion",
        opciones: ["Obedece", "A veces cuesta", "Cuesta mucho"],
      },
      { key: "funciona_bien_casa", label: "¿Qué cosas funcionan bien en casa?", sinObservacion: true },
      { key: "situaciones_dificiles", label: "¿Qué situaciones suelen ser difíciles?", sinObservacion: true },
    ],
  },
  {
    titulo: "7. Antecedentes del desarrollo",
    campos: [
      {
        key: "embarazo",
        label: "Controlado / Complicaciones",
        tipo: "opcion",
        opciones: ["Controlado", "Complicaciones"],
        subtitulo: "Embarazo",
      },
      {
        key: "parto_tipo",
        label: "Tipo",
        tipo: "opcion",
        opciones: ["Natural", "Cesárea"],
        subtitulo: "Parto",
      },
      { key: "semanas_gestacion", label: "Semanas de gestación", tipo: "texto", sinObservacion: true },
      { key: "peso_nacer", label: "Peso al nacer", tipo: "texto", sinObservacion: true },
      {
        key: "sosten_cefalico",
        label: "Sostén cefálico",
        tipo: "texto",
        subtitulo: "Desarrollo motor",
        sinObservacion: true,
      },
      { key: "se_sento", label: "Se sentó", tipo: "texto", sinObservacion: true },
      { key: "gateo", label: "Gateó", tipo: "texto", sinObservacion: true },
      { key: "camino", label: "Caminó", tipo: "texto", sinObservacion: true },
      {
        key: "primeras_palabras",
        label: "Primeras palabras",
        tipo: "texto",
        subtitulo: "Lenguaje",
        sinObservacion: true,
      },
      { key: "lenguaje_actual", label: "Actualmente", tipo: "texto", sinObservacion: true },
    ],
  },
  {
    titulo: "8. Salud",
    campos: [
      {
        key: "tiene_diagnostico",
        label: "¿Tiene algún diagnóstico?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
        sinObservacion: true,
      },
      { key: "diagnostico", label: "¿Cuál?", tipo: "texto", sinObservacion: true },
      { key: "medicacion", label: "¿Toma medicación?", tipo: "opcion", opciones: ["Sí", "No"] },
      {
        key: "asiste_otros_profesionales",
        label: "¿Asiste a otros profesionales?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
        sinObservacion: true,
      },
      { key: "otros_profesionales", label: "¿Cuáles?", sinObservacion: true },
    ],
  },
  {
    titulo: "9. Actividades diarias",
    campos: [
      {
        key: "alimentacion",
        label: "Alimentación",
        tipo: "multi",
        opciones: ["Come de todo", "Selectivo", "Le cuesta"],
      },
      {
        key: "sueno",
        label: "Sueño",
        tipo: "multi",
        opciones: ["Duerme bien", "Le cuesta dormir", "Se despierta mucho"],
      },
      {
        key: "esfinteres",
        label: "Control de esfínteres",
        tipo: "opcion",
        opciones: ["Sí", "En proceso", "No"],
      },
      { key: "vestido", label: "Vestido", tipo: "opcion", opciones: ["Solo", "Con ayuda"] },
      {
        key: "higiene",
        label: "Higiene (baño, dientes)",
        tipo: "opcion",
        opciones: ["Solo", "Con ayuda"],
      },
    ],
  },
  {
    titulo: "10. Juego",
    campos: [
      { key: "juego", label: "¿A qué le gusta jugar?", sinObservacion: true },
      {
        key: "juego_prefiere",
        label: "Prefiere",
        tipo: "opcion",
        opciones: ["Jugar solo", "Con otros", "Ambos"],
      },
    ],
  },
  {
    titulo: "11. Escuela",
    campos: [
      {
        key: "escuela_como_va",
        label: "¿Cómo le va en la escuela?",
        tipo: "opcion",
        opciones: ["Bien", "Regular", "Le cuesta"],
      },
      {
        key: "escuela_con_otros",
        label: "¿Cómo es con otros niños?",
        tipo: "opcion",
        opciones: ["Se relaciona bien", "Le cuesta", "Prefiere estar solo"],
      },
    ],
  },
  {
    titulo: "12. Sensorial",
    nota: "Marcar si notan que le molesta o busca mucho",
    campos: [
      { key: "sensorial_ruidos", label: "Ruidos", tipo: "opcion", opciones: ["Sí", "No"] },
      {
        key: "sensorial",
        label: "Texturas (ropa / comida)",
        tipo: "opcion",
        opciones: ["Sí", "No"],
      },
      {
        key: "sensorial_movimiento",
        label: "Movimiento",
        tipo: "opcion",
        opciones: ["Busca", "Evita", "No"],
      },
      {
        key: "sensorial_comida",
        label: "Comida",
        tipo: "opcion",
        opciones: ["Selectivo", "No"],
      },
    ],
  },
  {
    titulo: "13. Conducta",
    campos: [
      {
        key: "conducta",
        label: "Cuando se frustra",
        tipo: "multi",
        opciones: ["Llora", "Se enoja", "Se calma rápido", "Le cuesta calmarse"],
      },
      {
        key: "atencion",
        label: "Atención",
        tipo: "opcion",
        opciones: ["Buena", "Variable", "Le cuesta"],
      },
    ],
  },
  {
    titulo: "14. Autonomía",
    campos: [
      { key: "autonomia", label: "Nivel de independencia en actividades diarias", sinObservacion: true },
      { key: "necesita_ayuda", label: "Necesita ayuda en", sinObservacion: true },
    ],
  },
  {
    titulo: "15. Fortalezas del niño/a",
    campos: [
      { key: "fortalezas", label: "Intereses", sinObservacion: true },
      { key: "habilidades", label: "Habilidades", sinObservacion: true },
      { key: "disfruta", label: "Lo que más disfruta", sinObservacion: true },
    ],
  },
  {
    titulo: "16. Expectativas de la familia",
    campos: [
      { key: "expectativas", label: "¿Qué les gustaría lograr con la terapia?", sinObservacion: true },
      { key: "prioridades", label: "Prioridades actuales", sinObservacion: true },
    ],
  },
];

export const SECCIONES_ADULTOS: Seccion[] = [
  {
    titulo: "Datos personales",
    campos: [
      { key: "telefono", label: "Teléfono", tipo: "texto", sinObservacion: true },
      { key: "domicilio", label: "Domicilio", tipo: "texto", sinObservacion: true },
    ],
  },
  {
    titulo: "Ocupación y rutina",
    campos: [
      {
        key: "dedicacion",
        label: "¿A qué te dedicás actualmente?",
        tipo: "opcion",
        opciones: ["Trabajo", "Estudio", "Ambos", "No trabajo"],
      },
      { key: "ocupacion_rutina", label: "Ocupación / actividad", tipo: "texto", sinObservacion: true },
      { key: "dia_habitual", label: "¿Cómo es un día habitual tuyo?", sinObservacion: true },
    ],
  },
  {
    titulo: "Motivo de consulta",
    campos: [{ key: "motivo_consulta", label: "¿Qué te gustaría trabajar en terapia?", sinObservacion: true }],
  },
  {
    titulo: "Salud",
    campos: [
      {
        key: "tiene_diagnostico",
        label: "¿Tenés algún diagnóstico?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
        sinObservacion: true,
      },
      { key: "diagnostico", label: "¿Cuál?", sinObservacion: true },
      { key: "medicacion", label: "¿Tomás medicación?", tipo: "opcion", opciones: ["Sí", "No"] },
      {
        key: "tratamiento_otros",
        label: "¿Estás en tratamiento con otros profesionales?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
        sinObservacion: true,
      },
      { key: "otros_profesionales", label: "¿Cuáles?", sinObservacion: true },
    ],
  },
  {
    titulo: "Actividades de la vida diaria",
    nota: "Marcar lo que sientas que te cuesta",
    campos: [
      {
        key: "actividades_vida_diaria",
        label: "Te cuesta",
        tipo: "multi",
        opciones: [
          "Organización del día",
          "Mantener rutinas",
          "Higiene personal",
          "Alimentación",
          "Descanso / sueño",
          "Manejo del hogar",
          "Manejo del dinero",
          "Traslados / salidas",
          "Otro",
        ],
      },
    ],
  },
  {
    titulo: "Dificultades actuales",
    nota: "Hoy sentís que te cuesta (podés marcar o escribir)",
    campos: [
      {
        key: "dificultades_actuales",
        label: "Hoy te cuesta",
        tipo: "multi",
        opciones: [
          "Organizarme",
          "Sostener hábitos",
          "Concentrarme",
          "Descansar",
          "Manejar el estrés",
          "Vincularme con otros",
          "Otro",
        ],
      },
    ],
  },
  {
    titulo: "Autonomía",
    campos: [
      {
        key: "autonomia",
        label: "En general te sentís",
        tipo: "opcion",
        opciones: ["Independiente", "A veces necesito ayuda", "Dependiente en varias cosas"],
      },
    ],
  },
  {
    titulo: "Área laboral / académica",
    campos: [
      {
        key: "trabaja_estudia",
        label: "¿Actualmente trabajás o estudiás?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
      },
      {
        key: "laboral_dificultades",
        label: "¿Tenés dificultades?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
      },
      { key: "area_laboral", label: "¿Cuáles?", sinObservacion: true },
    ],
  },
  {
    titulo: "Tiempo libre y ocio",
    campos: [
      { key: "ocio", label: "¿Qué te gusta hacer en tu tiempo libre?", sinObservacion: true },
      {
        key: "tiempo_para_vos",
        label: "¿Sentís que tenés tiempo para vos?",
        tipo: "opcion",
        opciones: ["Sí", "No", "A veces"],
      },
    ],
  },
  {
    titulo: "Aspectos emocionales",
    campos: [
      { key: "aspectos_emocionales", label: "¿Cómo te estás sintiendo en esta etapa de tu vida?", sinObservacion: true },
      { key: "preocupaciones", label: "¿Hay algo que hoy te esté pesando o preocupando?", sinObservacion: true },
    ],
  },
  {
    titulo: "Sueño",
    campos: [
      { key: "sueno", label: "¿Dormís bien?", tipo: "opcion", opciones: ["Sí", "No"] },
      {
        key: "sueno_conciliar",
        label: "¿Te cuesta conciliar el sueño?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
      },
      {
        key: "sueno_despertares",
        label: "¿Te despertás durante la noche?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
      },
    ],
  },
  {
    titulo: "Red de apoyo",
    campos: [
      {
        key: "tiene_apoyo",
        label: "¿Contás con apoyo de alguien?",
        tipo: "opcion",
        opciones: ["Sí", "No"],
      },
      { key: "red_apoyo", label: "¿Quiénes?", sinObservacion: true },
    ],
  },
  {
    titulo: "Fortalezas",
    campos: [
      { key: "fortalezas", label: "¿Qué sentís que haces bien o te sale con facilidad?", sinObservacion: true },
      { key: "ayuda_sentirse_mejor", label: "¿Qué cosas te ayudan a sentirte mejor?", sinObservacion: true },
    ],
  },
  {
    titulo: "Expectativas",
    campos: [
      { key: "expectativas", label: "¿Qué te gustaría lograr con la terapia?", sinObservacion: true },
      { key: "que_cambiaria", label: "Si este proceso te ayudara, ¿qué cambiaría en tu vida?", sinObservacion: true },
    ],
  },
  {
    titulo: "Para cerrar",
    campos: [{ key: "para_cerrar", label: "¿Hay algo más que te gustaría contar?", sinObservacion: true }],
  },
];

export function seccionesDe(tipo: string): Seccion[] {
  return tipo === "adulto" ? SECCIONES_ADULTOS : SECCIONES_NINOS;
}

export function tituloFicha(tipo: string): string {
  return tipo === "adulto"
    ? "FICHA DE INICIO ADULTOS"
    : "FICHA DE INICIO – TERAPIA OCUPACIONAL";
}
