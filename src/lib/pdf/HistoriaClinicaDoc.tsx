import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  CabeceraImpresion,
  Casillas,
  Membrete,
  PieConfidencial,
  estilos,
  type MetaImpresion,
} from "@/lib/pdf/comunes";
import { CAMPOS_ACUERDO, seccionesDe, type DatosFicha } from "@/lib/ficha-fields";

export type PacienteBackup = {
  nombre: string;
  numero_registro: string;
  tipo: string;
  fecha_nacimiento: string | null;
  dni: string | null;
  ficha?: { datos: DatosFicha } | null;
  acuerdo?: {
    valor_sesion: number;
    forma_pago: string | null;
    duracion_sesion_minutos: number;
    modalidad: string;
    autoriza_imagenes: boolean;
    observaciones?: Record<string, string> | null;
  } | null;
  evolucion: { fecha: string; nota: string; objetivos_trabajados: string | null }[];
};

const ETIQUETAS_ACUERDO = new Map(CAMPOS_ACUERDO.map((c) => [c.key, c.label]));

function PacienteSection({ p }: { p: PacienteBackup }) {
  const secciones = seccionesDe(p.tipo);
  const datos = p.ficha?.datos ?? {};

  return (
    <View break>
      <Text style={estilos.membreteNombre}>{p.nombre}</Text>
      <Text style={{ ...estilos.membreteCentrado, marginBottom: 6 }}>
        Nº {p.numero_registro} · {p.tipo}
        {p.fecha_nacimiento ? ` · Nace ${p.fecha_nacimiento}` : ""}
        {p.dni ? ` · DNI ${p.dni}` : ""}
      </Text>

      <Text style={estilos.seccion}>Ficha de inicio</Text>
      {Object.keys(datos).length > 0 ? (
        secciones.map((seccion) => {
          const cargados = seccion.campos.filter((c) => datos[c.key]?.valor || datos[c.key]?.observacion);
          if (!cargados.length) return null;
          return (
            <View key={seccion.titulo}>
              <Text style={estilos.subtitulo}>{seccion.titulo}</Text>
              {cargados.map((campo) => {
                const item = datos[campo.key];
                const esOpcion = campo.tipo === "opcion" || campo.tipo === "multi";
                return (
                  <View key={campo.key}>
                    {esOpcion ? (
                      <View style={estilos.item}>
                        <Text style={estilos.etiqueta}>{campo.label}:</Text>
                        <Casillas opciones={campo.opciones ?? []} valor={item.valor} />
                      </View>
                    ) : (
                      <Text style={estilos.item}>
                        <Text style={estilos.etiqueta}>{campo.label}: </Text>
                        {item.valor}
                      </Text>
                    )}
                    {item.observacion && (
                      <Text style={estilos.observacion}>Obs.: {item.observacion}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })
      ) : (
        <Text style={estilos.item}>Sin ficha cargada.</Text>
      )}

      <Text style={estilos.seccion}>Acuerdo terapéutico</Text>
      {p.acuerdo ? (
        <>
          <Text style={estilos.item}>
            Valor de sesión: ${p.acuerdo.valor_sesion}
            {p.acuerdo.forma_pago ? ` (${p.acuerdo.forma_pago})` : ""} ·{" "}
            {p.acuerdo.duracion_sesion_minutos} min · {p.acuerdo.modalidad} · Autoriza imágenes:{" "}
            {p.acuerdo.autoriza_imagenes ? "Sí" : "No"}
          </Text>
          {p.acuerdo.observaciones &&
            Object.entries(p.acuerdo.observaciones).map(([key, obs]) => (
              <Text key={key} style={estilos.observacion}>
                Obs. {ETIQUETAS_ACUERDO.get(key) ?? key}: {obs}
              </Text>
            ))}
        </>
      ) : (
        <Text style={estilos.item}>Sin acuerdo cargado.</Text>
      )}

      {/* La evolución se lista de la última fecha hacia atrás, como exige la
          consulta de historia clínica. */}
      <Text style={estilos.seccion}>Evolución</Text>
      {p.evolucion.length > 0 ? (
        p.evolucion.map((n, i) => (
          <View key={i} style={{ marginBottom: 6 }}>
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
    </View>
  );
}

export function HistoriaClinicaDoc({
  pacientes,
  meta,
}: {
  pacientes: PacienteBackup[];
  meta: MetaImpresion;
}) {
  return (
    <Document title="Historias clínicas — Espacio Ñandubay">
      <Page size="A4" style={estilos.page}>
        <CabeceraImpresion meta={meta} />
        <PieConfidencial />

        <Membrete titulo="HISTORIAS CLÍNICAS" />
        <Text style={{ textAlign: "center", marginBottom: 4 }}>
          {pacientes.length} paciente{pacientes.length === 1 ? "" : "s"} · Emitido por {meta.usuario}{" "}
          el {meta.fecha}
        </Text>

        {pacientes.map((p) => (
          <PacienteSection key={p.numero_registro} p={p} />
        ))}
      </Page>
    </Document>
  );
}
