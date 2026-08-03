import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  CabeceraImpresion,
  Casillas,
  Membrete,
  PieConfidencial,
  estilos,
  type MetaImpresion,
} from "@/lib/pdf/comunes";
import { seccionesDe, tituloFicha, keyDeOpcion, type DatosFicha } from "@/lib/ficha-fields";

export type PacienteFicha = {
  nombre: string;
  numero_registro: string;
  tipo: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  to_nombre?: string | null;
};

function edad(fechaNacimiento: string | null): string {
  if (!fechaNacimiento) return "";
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let años = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) años--;
  return años >= 0 ? `${años} años` : "";
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return (
    <Text style={estilos.item}>
      <Text style={estilos.etiqueta}>{etiqueta}: </Text>
      {valor?.trim() ? valor : <Text style={estilos.vacio}>—</Text>}
    </Text>
  );
}

// Reproduce la ficha de inicio en el mismo orden y con los mismos ítems que
// la planilla en papel, con las casillas marcadas donde corresponde.
export function FichaInicioDoc({
  paciente,
  datos,
  meta,
}: {
  paciente: PacienteFicha;
  datos: DatosFicha;
  meta: MetaImpresion;
}) {
  const secciones = seccionesDe(paciente.tipo);
  const esNino = paciente.tipo !== "adulto";

  return (
    <Document title={`Ficha de inicio — ${paciente.nombre}`}>
      <Page size="A4" style={estilos.page}>
        <CabeceraImpresion meta={meta} />
        <PieConfidencial />

        <Membrete titulo={tituloFicha(paciente.tipo)} />

        <Text style={estilos.seccion}>
          {esNino ? "1. Datos personales del niño/a" : "Datos personales"}
        </Text>
        <Dato etiqueta="Nº de paciente" valor={paciente.numero_registro} />
        <Dato etiqueta="Nombre y apellido" valor={paciente.nombre} />
        <Dato
          etiqueta="Fecha de nacimiento / Edad"
          valor={[paciente.fecha_nacimiento, edad(paciente.fecha_nacimiento)]
            .filter(Boolean)
            .join("   ")}
        />
        <Dato etiqueta="DNI" valor={paciente.dni} />
        {paciente.to_nombre && <Dato etiqueta="Terapista Ocupacional" valor={paciente.to_nombre} />}

        {secciones.map((seccion, i) => (
          <View key={seccion.titulo} wrap={false}>
            {/* La primera sección ya se imprimió arriba junto a los datos
                identificatorios del paciente. */}
            {i === 0 ? null : (
              <>
                <Text style={estilos.seccion}>{seccion.titulo}</Text>
                {seccion.nota && <Text style={estilos.nota}>({seccion.nota})</Text>}
              </>
            )}
            {seccion.campos.map((campo) => {
              const item = datos[campo.key];
              const valor = item?.valor ?? "";
              const tipo = campo.tipo ?? "textarea";
              return (
                <View key={campo.key}>
                  {campo.subtitulo && (
                    <Text style={estilos.subtitulo}>{campo.subtitulo}:</Text>
                  )}
                  {tipo === "opcion" || tipo === "multi" ? (
                    <View style={estilos.item}>
                      <Text style={estilos.etiqueta}>{campo.label}:</Text>
                      <Casillas opciones={campo.opciones ?? []} valor={valor} />
                    </View>
                  ) : (
                    <Dato etiqueta={campo.label} valor={valor} />
                  )}
                  {item?.observacion && (
                    <Text style={estilos.observacion}>Obs.: {item.observacion}</Text>
                  )}
                  {/* Ítems donde cada opción lleva su propia aclaración. */}
                  {campo.observacionPorOpcion &&
                    (campo.opciones ?? []).map((opcion) => {
                      const obs = datos[keyDeOpcion(campo.key, opcion)]?.observacion;
                      return obs ? (
                        <Text key={opcion} style={estilos.observacion}>
                          {opcion} — {obs}
                        </Text>
                      ) : null;
                    })}
                </View>
              );
            })}
          </View>
        ))}
      </Page>
    </Document>
  );
}
