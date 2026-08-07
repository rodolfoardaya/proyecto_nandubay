import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  CabeceraImpresion,
  Membrete,
  PieConfidencial,
  estilos,
  type MetaImpresion,
} from "@/lib/pdf/comunes";

export type FilaSeguimiento = {
  fecha: string;
  hora: string;
  paciente: string;
  to: string;
  observacion: string | null;
};

export type BloqueReporte = {
  titulo: string;
  vacio: string;
  filas: FilaSeguimiento[];
};

function Tabla({ filas, vacio }: { filas: FilaSeguimiento[]; vacio: string }) {
  if (!filas.length) {
    return <Text style={{ ...estilos.item, color: "#999" }}>{vacio}</Text>;
  }

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          borderBottom: "1 solid #cfd8d2",
          paddingBottom: 2,
          marginTop: 4,
        }}
        fixed
      >
        <Text style={{ width: 62, fontFamily: "Helvetica-Bold" }}>Fecha</Text>
        <Text style={{ width: 38, fontFamily: "Helvetica-Bold" }}>Hora</Text>
        <Text style={{ width: 150, fontFamily: "Helvetica-Bold" }}>Paciente</Text>
        <Text style={{ width: 100, fontFamily: "Helvetica-Bold" }}>TO</Text>
        <Text style={{ flex: 1, fontFamily: "Helvetica-Bold" }}>Observación</Text>
      </View>
      {filas.map((f, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", paddingVertical: 2, borderBottom: "0.5 solid #eee" }}
          wrap={false}
        >
          <Text style={{ width: 62 }}>{f.fecha}</Text>
          <Text style={{ width: 38 }}>{f.hora}</Text>
          <Text style={{ width: 150 }}>{f.paciente}</Text>
          <Text style={{ width: 100 }}>{f.to}</Text>
          <Text style={{ flex: 1 }}>{f.observacion ?? "—"}</Text>
        </View>
      ))}
    </View>
  );
}

// Reporte de seguimiento del período: qué se adeuda, quién faltó, qué se
// cobró. Sirve para cerrar el mes y para reclamar lo pendiente.
export function ReporteSeguimientoDoc({
  bloques,
  desde,
  hasta,
  meta,
}: {
  bloques: BloqueReporte[];
  desde: string;
  hasta: string;
  meta: MetaImpresion;
}) {
  return (
    <Document title={`Seguimiento de turnos ${desde} a ${hasta}`}>
      <Page size="A4" style={estilos.page}>
        <CabeceraImpresion meta={meta} />
        <PieConfidencial />

        <Membrete titulo="SEGUIMIENTO DE TURNOS" />

        <Text style={{ textAlign: "center", marginBottom: 8 }}>
          Período del {desde} al {hasta}
        </Text>

        {bloques.map((b) => (
          <View key={b.titulo}>
            <Text style={estilos.seccion}>
              {b.titulo} ({b.filas.length})
            </Text>
            <Tabla filas={b.filas} vacio={b.vacio} />
          </View>
        ))}

        <Text style={{ ...estilos.nota, marginTop: 12 }}>
          Sólo se listan los turnos con seguimiento registrado. Los que todavía
          no se marcaron como presente/ausente o con su cobro no figuran acá.
        </Text>
      </Page>
    </Document>
  );
}
