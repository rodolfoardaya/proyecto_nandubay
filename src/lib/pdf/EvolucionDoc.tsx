import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  CabeceraImpresion,
  Membrete,
  PieConfidencial,
  estilos,
  type MetaImpresion,
} from "@/lib/pdf/comunes";

// La evolución sola: datos personales del paciente y, a continuación, las
// notas. Sin ficha de inicio ni acuerdo terapéutico.
//
// Es lo que se lleva a una interconsulta o se adjunta a un informe: ahí sobra
// —y a veces molesta— el resto de la historia clínica. Para el legajo
// completo está la "Historia clínica completa" (/api/backup), que no cambia.
export type PacienteEvolucion = {
  nombre: string;
  numero_registro: string;
  tipo: string;
  fecha_nacimiento: string | null;
  dni: string | null;
  to_nombre: string | null;
};

export type NotaEvolucion = {
  fecha: string;
  nota: string;
  objetivos_trabajados: string | null;
};

const datoFila = {
  flexDirection: "row" as const,
  marginBottom: 2,
};

const datoEtiqueta = {
  fontFamily: "Helvetica-Bold",
  width: 120,
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <View style={datoFila}>
      <Text style={datoEtiqueta}>{etiqueta}</Text>
      <Text>{valor}</Text>
    </View>
  );
}

export function EvolucionDoc({
  paciente,
  notas,
  meta,
}: {
  paciente: PacienteEvolucion;
  notas: NotaEvolucion[];
  meta: MetaImpresion;
}) {
  return (
    <Document title={`Evolución — ${paciente.nombre}`}>
      <Page size="A4" style={estilos.page}>
        <CabeceraImpresion
          meta={meta}
          paciente={{
            nombre: paciente.nombre,
            numero_registro: paciente.numero_registro,
            dni: paciente.dni,
            fecha_nacimiento: paciente.fecha_nacimiento,
          }}
        />
        <PieConfidencial />

        <Membrete titulo="EVOLUCIÓN" />

        <Text style={estilos.seccion}>Datos personales</Text>
        <View style={{ paddingLeft: 10 }}>
          <Dato etiqueta="Apellido y nombre" valor={paciente.nombre} />
          <Dato etiqueta="Nº de registro" valor={paciente.numero_registro} />
          <Dato etiqueta="DNI" valor={paciente.dni} />
          <Dato etiqueta="Fecha de nacimiento" valor={paciente.fecha_nacimiento} />
          <Dato etiqueta="Tipo de ficha" valor={paciente.tipo} />
          <Dato etiqueta="TO a cargo" valor={paciente.to_nombre} />
        </View>

        {/* De la última fecha hacia atrás, como exige la consulta de historia
            clínica y como ya se listan en pantalla. */}
        <Text style={estilos.seccion}>Notas de evolución</Text>
        {notas.length > 0 ? (
          notas.map((n, i) => (
            <View key={i} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={estilos.etiqueta}>{n.fecha}</Text>
              <Text style={estilos.item}>{n.nota}</Text>
              {n.objetivos_trabajados && (
                <Text style={estilos.observacion}>Objetivos: {n.objetivos_trabajados}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={estilos.item}>Sin notas de evolución.</Text>
        )}
      </Page>
    </Document>
  );
}
