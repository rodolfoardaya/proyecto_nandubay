import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  CabeceraImpresion,
  Membrete,
  PieConfidencial,
  estilos,
  type MetaImpresion,
} from "@/lib/pdf/comunes";

export type TurnoReporte = {
  fecha: string;
  hora: string;
  pacienteNombre: string;
  toNombre: string;
  modalidad: string;
  estado: string;
};

const fila = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  paddingVertical: 5,
  borderBottom: "1 solid #eee",
};

export function ReporteTurnosDoc({
  titulo,
  turnos,
  meta,
}: {
  titulo: string;
  turnos: TurnoReporte[];
  meta: MetaImpresion;
}) {
  return (
    <Document title={titulo}>
      <Page size="A4" style={estilos.page}>
        <CabeceraImpresion meta={meta} />
        <PieConfidencial />

        <Membrete titulo={titulo.toUpperCase()} />

        {turnos.map((t, i) => (
          <View key={i} style={fila}>
            <Text>
              {t.fecha} · {t.hora}
            </Text>
            <Text>{t.pacienteNombre}</Text>
            <Text>{t.toNombre}</Text>
            <Text>{t.modalidad}</Text>
            <Text style={estilos.etiqueta}>{t.estado}</Text>
          </View>
        ))}
        {turnos.length === 0 && <Text>No hay turnos en este período.</Text>}
      </Page>
    </Document>
  );
}
