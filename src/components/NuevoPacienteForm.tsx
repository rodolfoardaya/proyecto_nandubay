"use client";
import { BotonEnvio } from "@/components/ui/BotonEnvio";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CamposFicha } from "@/components/CamposFicha";
import { FirmaPad } from "@/components/FirmaPad";
import { AcuerdoTerapeuticoCampos, type ValoresAcuerdo } from "@/components/AcuerdoTerapeuticoCampos";
import type { Seccion, DatosFicha } from "@/lib/ficha-fields";
import { crearPaciente } from "@/app/panel/to/pacientes/actions";

type Props = {
  tipo: "nino" | "adulto";
  secciones: Seccion[];
};

export function NuevoPacienteForm({ tipo, secciones }: Props) {
  const [metodo, setMetodo] = useState<"digital" | "pdf">("digital");
  const [leyendo, setLeyendo] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [leido, setLeido] = useState(false);
  const [resumen, setResumen] = useState("");

  // El apellido y el nombre se cargan por separado, como en la planilla en
  // papel, pero se guardan juntos en `pacientes.nombre` (que es lo que ven
  // los listados, ordenados por apellido).
  const [paciente, setPaciente] = useState({
    apellido: "",
    nombre: "",
    dni: "",
    fecha_nacimiento: "",
  });
  const nombreCompleto = `${paciente.apellido} ${paciente.nombre}`.trim();
  const [datos, setDatos] = useState<DatosFicha>({});
  const [acuerdoValores, setAcuerdoValores] = useState<ValoresAcuerdo>({
    valor_sesion: "",
    forma_pago: "",
    duracion_sesion_minutos: "45",
    modalidad: "presencial",
    autoriza_imagenes: false,
  });

  function valorDe(key: string) {
    return datos[key]?.valor ?? "";
  }
  function obsDe(key: string) {
    return datos[key]?.observacion ?? "";
  }
  function setValor(key: string, valor: string) {
    setDatos({ ...datos, [key]: { valor, observacion: obsDe(key) } });
  }
  function setObs(key: string, observacion: string) {
    setDatos({ ...datos, [key]: { valor: valorDe(key), observacion } });
  }

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setLeyendo(true);
    setOcrError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("tipo", tipo);
      const res = await fetch("/api/planilla", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setOcrError(data?.error ?? "No se pudo leer la planilla.");
        return;
      }

      setPaciente({
        apellido: data.paciente?.apellido || "",
        nombre: data.paciente?.nombre || "",
        dni: data.paciente?.dni || "",
        fecha_nacimiento: data.paciente?.fecha_nacimiento || "",
      });
      setDatos(data.datos ?? {});

      const ac = data.acuerdo ?? {};
      const si = (v: string) => /^(si|sí|true|1|x)$/i.test((v ?? "").trim());
      setAcuerdoValores({
        valor_sesion: ac.valor_sesion ?? "",
        forma_pago: ac.forma_pago ?? "",
        duracion_sesion_minutos: ac.duracion_sesion_minutos || "45",
        modalidad: /online/i.test(ac.modalidad ?? "") ? "online" : "presencial",
        autoriza_imagenes: si(ac.autoriza_imagenes),
      });

      setResumen(
        `Se cargaron ${data.camposLeidos} datos de la planilla.` +
          (data.clavesDesconocidas?.length
            ? ` ${data.clavesDesconocidas.length} renglón(es) no se reconocieron y se ignoraron.`
            : "")
      );
      setLeido(true);
    } catch {
      setOcrError("No se pudo leer el archivo.");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <form action={crearPaciente} className="mt-6 grid gap-6">
      <input type="hidden" name="tipo" value={tipo} />

      {/* Paso 1: método de carga */}
      <section className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <p className="font-bold text-green-dark">1. Ficha de inicio</p>
        <div className="flex gap-2 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMetodo("digital")}
            className={`rounded-full px-4 py-2 ${metodo === "digital" ? "bg-green-mid text-white" : "border border-black/10"}`}
          >
            Ficha digital
          </button>
          <button
            type="button"
            onClick={() => setMetodo("pdf")}
            className={`rounded-full px-4 py-2 ${metodo === "pdf" ? "bg-green-mid text-white" : "border border-black/10"}`}
          >
            Cargar desde planilla
          </button>
        </div>

        {metodo === "pdf" && (
          <div className="mt-2 grid gap-3">
            <div className="rounded-xl bg-yellow-soft/30 p-4 text-sm">
              <p className="font-bold text-green-dark">1. Descargá la planilla</p>
              <p className="mt-1 text-foreground/70">
                Trae un renglón por dato, con las opciones válidas de cada uno.
                La completa una persona en Excel o un asistente que lea la ficha
                en papel. Solo hay que llenar las columnas{" "}
                <b>VALOR</b> y <b>OBSERVACION</b>, sin tocar las demás.
              </p>
              <a
                href={`/api/planilla?tipo=${tipo}`}
                className="mt-2 inline-block font-bold text-blue-mid hover:underline"
              >
                Descargar planilla de {tipo === "adulto" ? "adultos" : "niños"} (CSV) ↓
              </a>
            </div>

            <div>
              <p className="text-sm font-bold text-green-dark">
                2. Subí la planilla completada
              </p>
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleArchivo}
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3"
              />
              <p className="mt-1 text-xs text-foreground/50">
                Si la completaste en Excel, guardala como <b>CSV UTF-8</b>.
              </p>
            </div>

            {leyendo && <p className="text-sm text-blue-mid">Leyendo la planilla...</p>}
            {ocrError && <p className="text-sm text-orange">{ocrError}</p>}
            {leido && !leyendo && (
              <p className="text-sm font-semibold text-green-dark">
                {resumen} Revisá todo abajo y corregí lo que haga falta antes de guardar.
              </p>
            )}

            <p className="text-xs text-foreground/60">
              3. El escaneo del acuerdo firmado en papel se adjunta más abajo,
              en la sección <b>Acuerdo terapéutico</b>.
            </p>
          </div>
        )}
      </section>

      {/* Datos personales */}
      <section className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <p className="font-bold text-green-dark">Datos personales</p>
        {/* Lo que se guarda es el nombre completo; los dos campos de arriba
            son sólo la forma de cargarlo. */}
        <input type="hidden" name="nombre" value={nombreCompleto} />
        <input
          required
          placeholder="Apellido"
          value={paciente.apellido}
          onChange={(e) =>
            setPaciente({ ...paciente, apellido: e.target.value.toUpperCase() })
          }
          className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
        />
        <input
          required
          placeholder="Nombre"
          value={paciente.nombre}
          onChange={(e) => setPaciente({ ...paciente, nombre: e.target.value.toUpperCase() })}
          className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
        />
        <input
          name="dni"
          placeholder="DNI"
          value={paciente.dni}
          onChange={(e) => setPaciente({ ...paciente, dni: e.target.value })}
          className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
        />
        <p className="text-xs text-foreground/50">
          El número de registro (ej. A0001) lo asigna el sistema automáticamente al guardar.
        </p>
        <label className="text-sm font-semibold text-foreground/70">
          Fecha de nacimiento
          <input
            type="date"
            name="fecha_nacimiento"
            value={paciente.fecha_nacimiento}
            onChange={(e) => setPaciente({ ...paciente, fecha_nacimiento: e.target.value })}
            className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          />
        </label>
      </section>

      <CamposFicha
        secciones={secciones}
        datos={datos}
        onValor={setValor}
        onObservacion={setObs}
      />

      {/* Paso 2: acuerdo terapéutico */}
      <section className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <p className="font-bold text-green-dark">2. Acuerdo terapéutico</p>
        <AcuerdoTerapeuticoCampos
          tipo={tipo}
          valores={acuerdoValores}
          onValoresChange={setAcuerdoValores}
        />
        <FirmaPad name="firma" />
      </section>

      <BotonEnvio enCurso="Dando de alta..." className="justify-self-start">
        {metodo === "pdf" ? "Aceptar datos y dar de alta" : "Guardar paciente"}
      </BotonEnvio>
    </form>
  );
}
