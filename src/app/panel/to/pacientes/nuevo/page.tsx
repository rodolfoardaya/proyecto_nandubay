import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { SECCIONES_NINOS, SECCIONES_ADULTOS } from "@/lib/ficha-fields";
import { NuevoPacienteForm } from "@/components/NuevoPacienteForm";

// El alta de pacientes es tarea exclusiva de la TO. El admin solo puede
// consultar y modificar pacientes ya cargados, nunca darlos de alta.
export default async function NuevoPaciente({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const usuario = await requireRole("to", "admin");
  if (usuario.rol === "admin") redirect("/panel/admin/pacientes");

  const { tipo } = await searchParams;
  const esAdulto = tipo === "adulto";
  const secciones = esAdulto ? SECCIONES_ADULTOS : SECCIONES_NINOS;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-green-dark">
        Nuevo paciente
      </h1>

      <div className="mt-4 flex gap-2 text-sm font-semibold">
        <a
          href="?tipo=nino"
          className={`rounded-full px-4 py-2 ${!esAdulto ? "bg-green-mid text-white" : "bg-white border border-black/10"}`}
        >
          Niño/a
        </a>
        <a
          href="?tipo=adulto"
          className={`rounded-full px-4 py-2 ${esAdulto ? "bg-green-mid text-white" : "bg-white border border-black/10"}`}
        >
          Adulto
        </a>
      </div>

      <NuevoPacienteForm tipo={esAdulto ? "adulto" : "nino"} secciones={secciones} />
    </div>
  );
}
