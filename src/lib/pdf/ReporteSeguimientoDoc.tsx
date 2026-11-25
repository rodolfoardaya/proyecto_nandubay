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
  // Cuánto se cobró o se adeuda en ese turno. Sólo lo traen los bloques de
  // cobro; en los de asistencia no significa nada.
  valor: number | null;
  observacion: string | null;
};

export type BloqueReporte = {
  titulo: string;
  vacio: string;
  // Si el bloque es de cobros, se muestra el valor de cada turno y el total.
  conValor: boolean;
  filas: FilaSeguimiento[];
};

const pesos = (n: number) =>
  "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Tabla({
  filas,
  vacio,
  conValor,
}: {
  filas: FilaSeguimiento[];
  vacio: string;
  conValor: boolean;
}) {
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
        <Text style={{ width: 170, fontFamily: "Helvetica-Bold" }}>Paciente</Text>
        {conValor && (
          <Text style={{ width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" }}>
            Valor
          </Text>
        )}
        <Text style={{ flex: 1, fontFamily: "Helvetica-Bold", paddingLeft: 8 }}>
          Observación
        </Text>
      </View>
      {filas.map((f, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", paddingVertical: 2, borderBottom: "0.5 solid #eee" }}
          wrap={false}
        >
          <Text style={{ width: 62 }}>{f.fecha}</Text>
          <Text style={{ width: 38 }}>{f.hora}</Text>
          <Text style={{ width: 170 }}>{f.paciente}</Text>
          {conValor && (
            <Text style={{ width: 80, textAlign: "right" }}>
              {f.valor === null ? "—" : pesos(f.valor)}
            </Text>
          )}
          <Text style={{ flex: 1, paddingLeft: 8 }}>{f.observacion ?? "—"}</Text>
        </View>
      ))}

      {/* El total de la lista: es el número que se busca al cerrar el mes. */}
      {conValor && (
        <View
          style={{
            flexDirection: "row",
            paddingTop: 3,
            marginTop: 1,
            borderTop: "1 solid #cfd8d2",
          }}
        >
          <Text style={{ width: 270, fontFamily: "Helvetica-Bold" }}>
            Total ({filas.length} {filas.length === 1 ? "turno" : "turnos"})
          </Text>
          <Text style={{ width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" }}>
            {pesos(filas.reduce((s, f) => s + (f.valor ?? 0), 0))}
          </Text>
          <Text style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

// Reporte de seguimiento del período: qué se adeuda, quién faltó, qué se
// cobró. Sirve para cerrar el mes y para reclamar lo pendiente.
export function ReporteSeguimientoDoc({
  bloques,
  desde,
  hasta,
  toNombre,
  meta,
}: {
  bloques: BloqueReporte[];
  desde: string;
  hasta: string;
  // Va acá arriba, con las fechas, y no repetida en cada renglón: una hoja
  // impresa tiene que decir de quién es la agenda sin gastar una columna.
  toNombre?: string;
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
          {toNombre ? ` — ${toNombre}` : ""}
        </Text>

        {bloques.map((b) => (
          <View key={b.titulo}>
            <Text style={estilos.seccion}>
              {b.titulo} ({b.filas.length})
            </Text>
            <Tabla filas={b.filas} vacio={b.vacio} conValor={b.conValor} />
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
