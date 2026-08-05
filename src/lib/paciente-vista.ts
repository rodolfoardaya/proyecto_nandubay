import type { SupabaseClient } from "@supabase/supabase-js";

// URL firmada para un archivo del bucket privado. Dura una hora: alcanza para
// verlo o descargarlo y no deja nada accesible de forma permanente.
export async function archivoUrl(supabase: SupabaseClient, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// Las cinco secciones de la historia clínica de un paciente.
export const SECCIONES_PACIENTE = [
  {
    slug: "",
    titulo: "Datos personales",
    descripcion: "Identificación del paciente y estado general de la historia.",
    icono: "👤",
  },
  {
    slug: "ficha",
    titulo: "Ficha de inicio",
    descripcion: "La planilla completa, para consultar o corregir.",
    icono: "📋",
  },
  {
    slug: "acuerdo",
    titulo: "Acuerdo terapéutico",
    descripcion: "Valor, modalidad, autorizaciones y firma.",
    icono: "🤝",
  },
  {
    slug: "evolucion",
    titulo: "Historia clínica",
    descripcion: "Notas de evolución de cada sesión.",
    icono: "📝",
  },
  {
    slug: "documentos",
    titulo: "Estudios y documentos",
    descripcion: "Informes, estudios y certificados adjuntos.",
    icono: "📎",
  },
  {
    slug: "turnos",
    titulo: "Agenda de turnos",
    descripcion: "Turnos del paciente y alta de nuevos.",
    icono: "📅",
  },
];
