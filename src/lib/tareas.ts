// Opciones del módulo de tareas y recordatorios. Viven acá para que el
// formulario, la lista y los filtros usen siempre la misma lista y las mismas
// etiquetas: si mañana se agrega una categoría, se agrega en un solo lugar.

export type Prioridad = "alta" | "media" | "baja";
export type EstadoTarea = "pendiente" | "en_progreso" | "completada";

export const PRIORIDADES: { valor: Prioridad; label: string; color: string }[] = [
  { valor: "alta", label: "Alta", color: "bg-orange/20 text-orange" },
  { valor: "media", label: "Media", color: "bg-yellow-main/30 text-[#8a6400]" },
  { valor: "baja", label: "Baja", color: "bg-blue-light/30 text-blue-mid" },
];

export const ESTADOS: { valor: EstadoTarea; label: string }[] = [
  { valor: "pendiente", label: "Pendiente" },
  { valor: "en_progreso", label: "En progreso" },
  { valor: "completada", label: "Completada" },
];

export const CATEGORIAS = [
  { valor: "clinico", label: "Clínico" },
  { valor: "recordatorio", label: "Recordatorio" },
  { valor: "cita", label: "Cita" },
  { valor: "pago", label: "Pago" },
  { valor: "documentacion", label: "Documentación" },
  { valor: "preparacion", label: "Preparación" },
  { valor: "comunicacion", label: "Comunicación" },
  { valor: "administrativo", label: "Administrativo" },
  { valor: "planificacion", label: "Planificación" },
  { valor: "otras", label: "Otras" },
];

export type Tarea = {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  categoria: string | null;
  fecha_limite: string;
  hora_limite: string;
  responsable_usuario_id: string | null;
  responsable_paciente_id: string | null;
  paciente_id: string | null;
  avisar_email: boolean;
  email_aviso: string | null;
  avisar_whatsapp: boolean;
  telefono_aviso: string | null;
  estado: EstadoTarea;
  created_at: string;
};

export function etiquetaCategoria(valor: string | null) {
  return CATEGORIAS.find((c) => c.valor === valor)?.label ?? null;
}

export function etiquetaPrioridad(valor: Prioridad) {
  return PRIORIDADES.find((p) => p.valor === valor) ?? PRIORIDADES[1];
}

// Una tarea está vencida cuando su fecha y hora límite ya pasaron y todavía
// no se completó. Se compara con la hora de Tucumán, no con la del servidor.
export function estaVencida(t: { fecha_limite: string; hora_limite: string; estado: EstadoTarea }, hoy: string, ahoraHHMM: string) {
  if (t.estado === "completada") return false;
  if (t.fecha_limite < hoy) return true;
  return t.fecha_limite === hoy && t.hora_limite.slice(0, 5) < ahoraHHMM;
}

// El formulario manda un solo campo "responsable", porque para quien carga la
// tarea es una sola pregunta: quién la hace. Acá se traduce a las dos
// columnas que usa la base. El prefijo dice de qué tabla sale el id.
export function codigoResponsable(tipo: "u" | "p", id: string) {
  return `${tipo}:${id}`;
}

export function leerResponsable(codigo: string): {
  responsable_usuario_id: string | null;
  responsable_paciente_id: string | null;
} {
  const [tipo, id] = codigo.split(":");
  if (tipo === "u" && id) return { responsable_usuario_id: id, responsable_paciente_id: null };
  if (tipo === "p" && id) return { responsable_usuario_id: null, responsable_paciente_id: id };
  return { responsable_usuario_id: null, responsable_paciente_id: null };
}

export function responsableActual(t: {
  responsable_usuario_id: string | null;
  responsable_paciente_id: string | null;
}) {
  if (t.responsable_usuario_id) return codigoResponsable("u", t.responsable_usuario_id);
  if (t.responsable_paciente_id) return codigoResponsable("p", t.responsable_paciente_id);
  return "";
}
