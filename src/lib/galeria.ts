// Secciones de fotos del sitio público.
//
// Todas tienen la misma forma: una carpeta en /public/galeria/<slug>/ con las
// fotos numeradas desde 00. La 00 es la principal (la placa con el título de
// la actividad, o el afiche en el caso de Obras sociales y Recordatorio) y el
// resto se muestran en grilla debajo. Los archivos se renombran al copiarlos:
// sin espacios ni acentos, porque el servidor es Linux y estos nombres van en
// la URL.
//
// `enGaleria` distingue las dos cosas que hoy conviven acá:
//   true  → actividad pasada; aparece como tarjeta en la sección Galería.
//   false → información permanente; se llega por su botón en la portada.
//
// Para sumar fotos a una sección ya existente sólo hay que copiarlas a la
// carpeta numeradas en orden y subir `cantidadFotos`. Para crear una nueva,
// agregar una entrada acá.

export type SeccionFotos = {
  slug: string;
  titulo: string;
  // Cantidad de fotos además de la principal (01, 02, ...).
  cantidadFotos: number;
  enGaleria: boolean;
};

export const SECCIONES: SeccionFotos[] = [
  {
    slug: "colonia-sensorial-de-verano",
    titulo: "Colonia sensorial de verano",
    cantidadFotos: 9,
    enGaleria: true,
  },
  {
    slug: "taller-de-pascuas",
    titulo: "Taller de Pascuas",
    cantidadFotos: 3,
    enGaleria: true,
  },
  {
    slug: "obras-sociales",
    titulo: "Obras sociales",
    cantidadFotos: 0,
    enGaleria: false,
  },
  {
    slug: "recordatorio-para-las-familias",
    titulo: "Recordatorio para las familias",
    cantidadFotos: 0,
    enGaleria: false,
  },
];

export const ACTIVIDADES = SECCIONES.filter((s) => s.enGaleria);

export function portadaDe(seccion: SeccionFotos) {
  return `/galeria/${seccion.slug}/00.jpeg`;
}

export function fotosDe(seccion: SeccionFotos) {
  return Array.from(
    { length: seccion.cantidadFotos },
    (_, i) => `/galeria/${seccion.slug}/${String(i + 1).padStart(2, "0")}.jpeg`
  );
}

export function seccionPorSlug(slug: string) {
  return SECCIONES.find((s) => s.slug === slug) ?? null;
}
