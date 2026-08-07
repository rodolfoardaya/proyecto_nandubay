/* eslint-disable jsx-a11y/alt-text -- El <Image> de @react-pdf/renderer no
   acepta alt: no es una imagen del DOM, se dibuja dentro del PDF. */
import fs from "node:fs";
import path from "node:path";
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CONSULTORIO } from "@/lib/consultorio";

// Datos de la impresión que la Ley 26.529 exige poder rastrear: quién
// imprimió la historia clínica y cuándo.
export type MetaImpresion = { usuario: string; fecha: string };

export function metaImpresion(nombreUsuario: string): MetaImpresion {
  return {
    usuario: nombreUsuario,
    fecha: new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
  };
}

// El logo se lee del disco una sola vez: @react-pdf/renderer no puede
// resolver rutas del navegador dentro del proceso de Node.
let logoCache: Buffer | null | undefined;

function logo(): Buffer | null {
  if (logoCache === undefined) {
    try {
      logoCache = fs.readFileSync(path.join(process.cwd(), CONSULTORIO.logoPath));
    } catch {
      logoCache = null;
    }
  }
  return logoCache;
}

export const estilos = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 44, paddingHorizontal: 46, fontSize: 9.5, fontFamily: "Helvetica", lineHeight: 1.4 },
  cabecera: {
    position: "absolute",
    top: 18,
    left: 46,
    right: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1 solid #cfd8d2",
    paddingBottom: 6,
  },
  cabeceraMarca: { flexDirection: "row", alignItems: "center", gap: 6 },
  cabeceraLogo: { width: 26, height: 26 },
  cabeceraNombre: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1F6F4A" },
  cabeceraMeta: { fontSize: 7.5, color: "#666", textAlign: "right" },
  cabeceraPaciente: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#333" },
  cabeceraPacienteDatos: { fontSize: 7.5, color: "#666" },

  membreteLogo: { width: 92, height: 92, alignSelf: "center", marginBottom: 6 },
  membreteCentrado: { textAlign: "center", fontSize: 10 },
  membreteNombre: { textAlign: "center", fontSize: 11, fontFamily: "Helvetica-Bold" },
  membreteContacto: { fontSize: 9.5, marginTop: 2 },
  titulo: {
    textAlign: "center",
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 10,
    textDecoration: "underline",
  },

  seccion: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 3 },
  nota: { fontSize: 8.5, color: "#666", marginBottom: 3 },
  subtitulo: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginTop: 5 },
  item: { marginBottom: 2.5, paddingLeft: 10 },
  etiqueta: { fontFamily: "Helvetica-Bold" },
  observacion: { paddingLeft: 20, fontSize: 8.5, color: "#555" },
  vacio: { color: "#999" },

  parrafo: { marginBottom: 6, textAlign: "justify" },
  clausula: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 9, marginBottom: 3 },
  firmaLinea: { marginTop: 8, flexDirection: "row", alignItems: "flex-end", gap: 4 },
  firmaEtiqueta: { fontFamily: "Helvetica-Bold" },
  firmaValor: { flex: 1, borderBottom: "1 solid #333", paddingBottom: 1 },
  firmaImagen: { height: 34, width: 110 },

  pieBloque: {
    position: "absolute",
    bottom: 20,
    left: 46,
    right: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pie: { fontSize: 7.5, color: "#888" },
  pieNumero: { fontSize: 7.5, color: "#666", fontFamily: "Helvetica-Bold" },
});

// Cabecera fija que se repite en todas las páginas: logo del consultorio,
// fecha de impresión y usuario que imprime.
// Identificación del paciente, para que cada hoja suelta se pueda atribuir
// sin ambigüedad a su historia clínica.
export type PacienteCabecera = {
  nombre: string;
  numero_registro: string;
  dni?: string | null;
  fecha_nacimiento?: string | null;
};

export function CabeceraImpresion({
  meta,
  paciente,
}: {
  meta: MetaImpresion;
  paciente?: PacienteCabecera;
}) {
  const img = logo();
  return (
    <View style={estilos.cabecera} fixed>
      <View style={estilos.cabeceraMarca}>
        {img && <Image style={estilos.cabeceraLogo} src={{ data: img, format: "jpg" }} />}
        <View>
          <Text style={estilos.cabeceraNombre}>Espacio Ñandubay</Text>
          {paciente && (
            <>
              <Text style={estilos.cabeceraPaciente}>{paciente.nombre}</Text>
              <Text style={estilos.cabeceraPacienteDatos}>
                Nº {paciente.numero_registro}
                {paciente.dni ? ` · DNI ${paciente.dni}` : ""}
                {paciente.fecha_nacimiento ? ` · Nace ${paciente.fecha_nacimiento}` : ""}
              </Text>
            </>
          )}
        </View>
      </View>
      <Text style={estilos.cabeceraMeta}>
        Impreso el {meta.fecha}
        {"\n"}
        Usuario: {meta.usuario}
      </Text>
    </View>
  );
}

// Membrete completo, igual al de las planillas en papel. Va una sola vez,
// al comienzo del documento.
export function Membrete({ titulo }: { titulo: string }) {
  const img = logo();
  return (
    <View>
      {img && <Image style={estilos.membreteLogo} src={{ data: img, format: "jpg" }} />}
      <Text style={estilos.membreteCentrado}>{CONSULTORIO.rubro}</Text>
      <Text style={estilos.membreteNombre}>{CONSULTORIO.nombre}</Text>
      <Text style={estilos.membreteCentrado}>{CONSULTORIO.lema}</Text>
      <Text style={estilos.membreteContacto}>{CONSULTORIO.direccion}</Text>
      <Text style={estilos.membreteContacto}>{CONSULTORIO.telefono}</Text>
      <Text style={estilos.membreteContacto}>{CONSULTORIO.correo}</Text>
      <Text style={estilos.titulo}>{titulo}</Text>
    </View>
  );
}

// El número de hoja va en todas: una historia clínica impresa que se
// desordena o a la que le falta una hoja tiene que poder detectarse.
export function PieConfidencial() {
  return (
    <View style={estilos.pieBloque} fixed>
      <Text style={estilos.pie}>
        Documento clínico confidencial — Ley 26.529 y Ley 25.326. Uso exclusivo profesional.
      </Text>
      {/* `fixed` va también en el propio Text: sin eso el número se calcula
          una sola vez y se repite igual en todas las hojas. */}
      <Text
        fixed
        style={estilos.pieNumero}
        render={({ pageNumber, totalPages }) => `Hoja ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

// Casillas de la planilla en papel, en ASCII para no depender de que la
// fuente tenga los glifos de casilla marcada.
export function Casillas({
  opciones,
  valor,
}: {
  opciones: string[];
  valor: string;
}) {
  const marcadas = valor
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return (
    <Text>
      {opciones
        .map((o) => `${marcadas.includes(o) ? "[X]" : "[ ]"} ${o}`)
        .join("   ")}
    </Text>
  );
}
