/* eslint-disable jsx-a11y/alt-text -- El <Image> de @react-pdf/renderer no
   acepta alt: no es una imagen del DOM, se dibuja dentro del PDF. */
import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import {
  CabeceraImpresion,
  Membrete,
  PieConfidencial,
  estilos,
  type MetaImpresion,
} from "@/lib/pdf/comunes";
import { CAMPOS_ACUERDO } from "@/lib/ficha-fields";

const ETIQUETAS_ACUERDO = new Map(CAMPOS_ACUERDO.map((c) => [c.key, c.label]));

// El texto de las cláusulas es el del acuerdo en papel del consultorio,
// transcrito literalmente: es un documento con valor de consentimiento
// informado, así que no se reescribe ni se resume. Solo los valores
// variables (honorarios, duración, autorización de imágenes) se completan
// con lo cargado en el sistema.

export type AcuerdoImpresion = {
  valor_sesion: number | null;
  forma_pago: string | null;
  duracion_sesion_minutos: number | null;
  modalidad: string | null;
  autoriza_imagenes: boolean;
  observaciones?: Record<string, string> | null;
  fecha?: string | null;
};

export type PacienteAcuerdo = {
  nombre: string;
  numero_registro: string;
  tipo: string;
  dni: string | null;
  responsable?: string | null;
  to_nombre?: string | null;
};

function Parrafo({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.parrafo}>{children}</Text>;
}

function Clausula({ titulo }: { titulo: string }) {
  return <Text style={estilos.clausula}>{titulo}</Text>;
}

function Vinetas({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 6 }}>
      {items.map((i) => (
        <Text key={i} style={estilos.item}>
          •  {i}
        </Text>
      ))}
    </View>
  );
}

function Completado({ valor }: { valor: string | number | null | undefined }) {
  const texto = valor === null || valor === undefined || valor === "" ? "" : String(valor);
  return (
    <Text style={{ fontFamily: "Helvetica-Bold", textDecoration: "underline" }}>
      {texto ? ` ${texto} ` : "                    "}
    </Text>
  );
}

function Marca({ activa }: { activa: boolean }) {
  return <Text>{activa ? "[X]" : "[ ]"}</Text>;
}

function BloqueFirmas({
  paciente,
  esNino,
  firmaResponsable,
  fecha,
}: {
  paciente: PacienteAcuerdo;
  esNino: boolean;
  firmaResponsable?: Buffer | null;
  fecha?: string | null;
}) {
  const fechaTexto = fecha ? new Date(fecha).toLocaleDateString("es-AR") : "";

  if (!esNino) {
    return (
      <View>
        <View style={estilos.firmaLinea}>
          <Text style={estilos.firmaEtiqueta}>Firma:</Text>
          <View style={estilos.firmaValor}>
            {firmaResponsable && (
              <Image style={estilos.firmaImagen} src={{ data: firmaResponsable, format: "png" }} />
            )}
          </View>
        </View>
        <View style={estilos.firmaLinea}>
          <Text style={estilos.firmaEtiqueta}>Aclaración:</Text>
          <Text style={estilos.firmaValor}>{paciente.nombre}</Text>
        </View>
        <View style={estilos.firmaLinea}>
          <Text style={estilos.firmaEtiqueta}>Fecha:</Text>
          <Text style={estilos.firmaValor}>{fechaTexto}</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Parrafo>El presente documento se firma en conformidad.</Parrafo>
      <View style={estilos.firmaLinea}>
        <Text style={estilos.firmaEtiqueta}>Nombre del paciente:</Text>
        <Text style={estilos.firmaValor}>{paciente.nombre}</Text>
      </View>
      <View style={estilos.firmaLinea}>
        <Text style={estilos.firmaEtiqueta}>DNI:</Text>
        <Text style={estilos.firmaValor}>{paciente.dni ?? ""}</Text>
      </View>
      <View style={estilos.firmaLinea}>
        <Text style={estilos.firmaEtiqueta}>Nombre del responsable:</Text>
        <Text style={estilos.firmaValor}>{paciente.responsable ?? ""}</Text>
      </View>
      <View style={estilos.firmaLinea}>
        <Text style={estilos.firmaEtiqueta}>Firma del responsable:</Text>
        <View style={estilos.firmaValor}>
          {firmaResponsable && (
            <Image style={estilos.firmaImagen} src={{ data: firmaResponsable, format: "png" }} />
          )}
        </View>
      </View>
      <View style={estilos.firmaLinea}>
        <Text style={estilos.firmaEtiqueta}>Firma del profesional:</Text>
        <Text style={estilos.firmaValor}>{paciente.to_nombre ?? ""}</Text>
      </View>
      <View style={estilos.firmaLinea}>
        <Text style={estilos.firmaEtiqueta}>Fecha:</Text>
        <Text style={estilos.firmaValor}>{fechaTexto}</Text>
      </View>
    </View>
  );
}

function AcuerdoNinos({ acuerdo }: { acuerdo: AcuerdoImpresion }) {
  return (
    <View>
      <Parrafo>
        Se solicita la lectura atenta del presente documento. La firma implica la aceptación plena
        de las condiciones aquí establecidas y de las pautas de organización, funcionamiento y
        convivencia profesional, con el objetivo de garantizar un trabajo responsable, ético y
        coordinado, que favorezca la continuidad y calidad del tratamiento.
      </Parrafo>

      <Clausula titulo="1. Consentimiento informado" />
      <Parrafo>
        El/la tutor/a legal declara haber sido informado/a sobre los objetivos del proceso
        terapéutico, la modalidad de intervención, los posibles beneficios y las limitaciones del
        tratamiento, otorgando su consentimiento para el inicio y continuidad del mismo. Las
        intervenciones se realizan conforme a las incumbencias profesionales de Terapia Ocupacional
        y a las normativas éticas y legales vigentes.
      </Parrafo>

      <Clausula titulo="2. Modalidad de Trabajo" />
      <Parrafo>
        El profesional se compromete a desempeñar la labor de manera interdisciplinaria, respetando
        los roles específicos de cada disciplina y manteniendo una comunicación fluida y
        colaborativa con el equipo terapéutico del paciente que se desempeña en otra institución o
        espacio, dentro del marco del secreto profesional y la normativa vigente.
      </Parrafo>

      <Clausula titulo="3. Modalidad de las Sesiones" />
      <Parrafo>
        Las sesiones tendrán una duración aproximada de 30 a 45 minutos. Se solicita puntualidad. Se
        establece un tiempo de tolerancia de quince (15) minutos desde el horario pactado.
        Transcurrido dicho plazo, el turno podrá considerarse cancelado. En caso de llegada tardía
        dentro del margen de tolerancia, la sesión finalizará en el horario habitual.
      </Parrafo>
      <Parrafo>
        Los días y horarios serán acordados entre las partes y tendrán vigencia durante todo el año
        en curso. Los mismos serán revisados para el año siguiente conforme a la organización
        institucional y disponibilidad de agenda en el mes de enero.
      </Parrafo>

      <Clausula titulo="4. Ausencias" />
      <Parrafo>
        Las cancelaciones deberán notificarse con un mínimo de veinticuatro (24) horas de
        anticipación. En caso de inasistencia sin aviso previo o sin respetar dicho plazo, se
        cobrará el cien por ciento (100%) del valor de la sesión; en caso de utilizar planilla, la
        sesión deberá firmarse.
      </Parrafo>
      <Parrafo>
        Las ausencias del profesional no serán cobradas, ni firmadas en planilla. Si el profesional
        no pudiera asistir y dispusiera un reemplazo, la sesión se considerará brindada y deberá
        abonarse o firmarse como realizada, siempre que el tutor acepte dicho reemplazo.
      </Parrafo>

      <Clausula titulo="5. Honorarios y Modalidad Administrativa" />
      <Text style={estilos.parrafo}>
        El valor de la sesión será de $<Completado valor={acuerdo.valor_sesion} />
        {acuerdo.forma_pago ? ` — Forma de pago: ${acuerdo.forma_pago}` : ""}
      </Text>
      <Parrafo>
        Los honorarios se actualizarán trimestralmente de acuerdo con la situación económica
        vigente, con notificación previa.
      </Parrafo>
      <Parrafo>
        En los casos de pacientes que trabajen con obra social o prepaga, la gestión del reintegro
        será responsabilidad exclusiva de la familia. La falta de pago por parte de la entidad
        financiadora no exime de la obligación de abonar las sesiones, en caso la obra social no se
        haga cargo.
      </Parrafo>

      <Clausula titulo="6. Planillas y Registros" />
      <Parrafo>
        Es obligatoria la firma de las planillas de asistencia y/o registros institucionales
        correspondientes a cada sesión realizada. Las planillas deberán firmarse durante los últimos
        diez (10) días de cada mes, sin excepción. Se deberá firmar la planilla completa, incluyendo
        todas las sesiones autorizadas del período. La firma de la planilla constituye respaldo
        formal del trabajo profesional realizado. La vigencia administrativa será desde el inicio de
        la autorización correspondiente hasta su fecha de vencimiento. Ej: Febrero 2026-Diciembre
        2026. El tutor deberá garantizar dicho periodo.
      </Parrafo>

      <Clausula titulo="7. Reuniones" />
      <Parrafo>
        Los/as profesionales asistirán a reuniones escolares cuando sean convocados/as, con fines de
        seguimiento y planificación conjunta. Las mismas deberán solicitarse con anticipación y
        serán abonadas al valor equivalente a una sesión por profesional asistente.
      </Parrafo>
      <Parrafo>
        Con las familias se establecen tres (3) reuniones anuales de carácter virtual o presencial.
      </Parrafo>
      <Vinetas
        items={["Una al inicio del proceso,", "Una en el mes de julio,", "Una en el mes de diciembre."]}
      />
      <Parrafo>
        Las reuniones forman parte del proceso terapéutico y requieren compromiso de asistencia.
      </Parrafo>
      <Parrafo>
        En caso de requerir el tutor una reunión extra se descontará o cobrará una sesión.
      </Parrafo>

      <Clausula titulo="8. Informes y Constancias" />
      <Parrafo>
        Se realizarán dos (2) informes semestrales sin cargo por paciente (uno con la devolución de
        julio y otro con la devolución de diciembre).
      </Parrafo>
      <Parrafo>Los informes adicionales serán arancelados como la mitad de una sesión.</Parrafo>
      <Parrafo>Los informes deberán solicitarse con siete (7) días de anticipación.</Parrafo>
      <Parrafo>
        Las constancias, certificados o pedidos de licencias deberán solicitarse con una
        anticipación mínima de siete (7) días y serán arancelados como la mitad de una sesión, a
        partir del segundo (2) pedido.
      </Parrafo>

      <Clausula titulo="9. Confidencialidad" />
      <Parrafo>
        La información obtenida durante el proceso terapéutico será confidencial y utilizada
        exclusivamente con fines terapéuticos.
      </Parrafo>

      <Clausula titulo="10. Uso de imágenes y material audiovisual" />
      <Text style={estilos.parrafo}>
        El/la tutor/a legal: <Marca activa={acuerdo.autoriza_imagenes} /> Autoriza{"    "}
        <Marca activa={!acuerdo.autoriza_imagenes} /> No autoriza
      </Text>
      <Parrafo>
        la toma de fotografías y/o videos del niño/a durante las sesiones, con fines de registro
        clínico, seguimiento terapéutico y/o difusión institucional en redes sociales y materiales
        de comunicación del Espacio Ñandubay.
      </Parrafo>
      <Parrafo>
        En caso de autorizar la difusión, se garantiza que el material será utilizado de manera
        respetuosa, cuidando la identidad, la intimidad y la dignidad del niño/a y su familia, sin
        datos personales identificatorios.
      </Parrafo>
      <Parrafo>Esta autorización podrá ser revocada en cualquier momento por escrito.</Parrafo>

      <Clausula titulo="11. Normas de Convivencia" />
      <Parrafo>
        Se solicita que los pacientes no ingresen solos al establecimiento y esperen hasta ser
        recibidos por el profesional. La familia será responsable del acompañamiento en la vía
        pública. El tutor deberá cumplir con el horario de retiro del niño, presentándose unos
        minutos antes de la finalización de la sesión.
      </Parrafo>
      <Parrafo>
        El paciente no deberá asistir si presenta fiebre o síntomas compatibles con enfermedad.
      </Parrafo>
      <Parrafo>Se prioriza el respeto y el diálogo como base del vínculo terapéutico.</Parrafo>

      <Clausula titulo="12. Interrupción del proceso" />
      <Parrafo>
        El/la tutor/a podrá solicitar la interrupción del proceso terapéutico en cualquier momento,
        comprometiéndose a comunicar con anticipación y, cuando sea posible, realizar una entrevista
        de cierre.
      </Parrafo>
    </View>
  );
}

function AcuerdoAdultos({ acuerdo }: { acuerdo: AcuerdoImpresion }) {
  return (
    <View>
      <Parrafo>
        Este espacio está pensado para acompañarte en tu proceso, respetando tus tiempos, tus
        necesidades y tu historia.
      </Parrafo>
      <Parrafo>
        Para que el trabajo sea cuidado y ordenado, te compartimos algunos acuerdos importantes:
      </Parrafo>
      <Parrafo>
        Se solicita la lectura atenta del presente documento. La firma implica la aceptación de las
        condiciones y acuerdos de funcionamiento del espacio, con el objetivo de sostener un proceso
        terapéutico cuidado, respetuoso y de calidad.
      </Parrafo>

      <Clausula titulo="SOBRE EL ESPACIO TERAPÉUTICO" />
      <Parrafo>
        El espacio promueve un abordaje integral, centrado en la persona y en sus ocupaciones
        significativas.
      </Parrafo>
      <Parrafo>
        En caso de ser necesario, se podrá trabajar de manera articulada con otros profesionales,
        siempre respetando la confidencialidad.
      </Parrafo>
      <Text style={estilos.parrafo}>
        Las sesiones tienen una duración de
        <Completado valor={acuerdo.duracion_sesion_minutos} />
        minutos.
        {acuerdo.modalidad ? ` Modalidad: ${acuerdo.modalidad}.` : ""}
      </Text>
      <Parrafo>
        Se solicita puntualidad. Se establece una tolerancia de 15 minutos. En caso de llegada
        tardía, la sesión finalizará en el horario habitual. Los días y horarios serán acordados
        previamente y sostenidos en el tiempo.
      </Parrafo>

      <Clausula titulo="ASISTENCIA Y AUSENCIAS" />
      <Parrafo>
        En caso de no poder asistir, se solicita avisar con al menos 24 hs de anticipación. Las
        ausencias sin aviso o con poco tiempo no podrán recuperarse y serán cobradas en su
        totalidad. Esto permite cuidar los tiempos del espacio y de otras personas que también lo
        necesitan.
      </Parrafo>
      <Parrafo>Las ausencias del profesional no serán cobradas.</Parrafo>

      <Clausula titulo="COMUNICACIÓN" />
      <Parrafo>La comunicación se realiza por: 3815821197</Parrafo>
      <Parrafo>Se responderá dentro de los horarios laborales.</Parrafo>

      <Clausula titulo="SOBRE EL PROCESO" />
      <Parrafo>
        El/la paciente declara haber sido informado/a sobre los objetivos del proceso, la modalidad
        de trabajo, los posibles alcances y sus límites, prestando conformidad para el inicio y
        continuidad del mismo.
      </Parrafo>
      <Parrafo>
        El acompañamiento se realiza dentro del marco de la Terapia Ocupacional, respetando
        criterios éticos y profesionales.
      </Parrafo>
      <Parrafo>
        Cada proceso es único y tiene sus tiempos. No se buscan cambios inmediatos, sino sostenidos
        y significativos. La participación y compromiso son fundamentales para el acompañamiento.
      </Parrafo>

      <Clausula titulo="CONFIDENCIALIDAD" />
      <Parrafo>
        La información compartida será cuidada y utilizada únicamente con fines terapéuticos.
      </Parrafo>

      <Clausula titulo="HONORARIOS" />
      <Text style={estilos.parrafo}>
        Valor de la sesión: $<Completado valor={acuerdo.valor_sesion} />
      </Text>
      <Text style={estilos.parrafo}>
        Forma de pago: <Completado valor={acuerdo.forma_pago} />
      </Text>
      <Parrafo>Actualizaciones: Cuatrimestrales</Parrafo>

      <Clausula titulo="INFORMES" />
      <Parrafo>
        Se realizarán informes cuando sean requeridos. Los mismos deberán solicitarse con al menos 7
        días de anticipación. Los informes adicionales podrán ser arancelados.
      </Parrafo>

      <Clausula titulo="NORMAS DE CONVIVENCIA" />
      <Vinetas
        items={[
          "Se prioriza el respeto y el diálogo.",
          "No asistir en caso de enfermedad.",
          "Cuidar el espacio compartido.",
        ]}
      />
    </View>
  );
}

export function AcuerdoDoc({
  paciente,
  acuerdo,
  meta,
  firmaResponsable,
}: {
  paciente: PacienteAcuerdo;
  acuerdo: AcuerdoImpresion;
  meta: MetaImpresion;
  firmaResponsable?: Buffer | null;
}) {
  const esNino = paciente.tipo !== "adulto";
  const titulo = esNino
    ? "Acuerdo terapéutico y consentimiento informado"
    : "ACUERDO DE ACOMPAÑAMIENTO TERAPÉUTICO";

  const observaciones = Object.entries(acuerdo.observaciones ?? {}).filter(([, v]) => v?.trim());

  return (
    <Document title={`Acuerdo terapéutico — ${paciente.nombre}`}>
      <Page size="A4" style={estilos.page}>
        <CabeceraImpresion
          meta={meta}
          paciente={{
            nombre: paciente.nombre,
            numero_registro: paciente.numero_registro,
            dni: paciente.dni,
          }}
        />
        <PieConfidencial />

        <Membrete titulo={titulo} />
        <Text style={{ marginBottom: 8, fontSize: 9 }}>
          Paciente: {paciente.nombre} — Nº {paciente.numero_registro}
          {paciente.dni ? ` — DNI ${paciente.dni}` : ""}
        </Text>

        {esNino ? <AcuerdoNinos acuerdo={acuerdo} /> : <AcuerdoAdultos acuerdo={acuerdo} />}

        {observaciones.length > 0 && (
          <View>
            <Clausula titulo="Observaciones de la Terapista Ocupacional" />
            {observaciones.map(([key, valor]) => (
              <Text key={key} style={estilos.item}>
                •  {ETIQUETAS_ACUERDO.get(key) ?? key}: {valor}
              </Text>
            ))}
          </View>
        )}

        <View style={{ marginTop: 14 }}>
          <BloqueFirmas
            paciente={paciente}
            esNino={esNino}
            firmaResponsable={firmaResponsable}
            fecha={acuerdo.fecha}
          />
        </View>
      </Page>
    </Document>
  );
}
