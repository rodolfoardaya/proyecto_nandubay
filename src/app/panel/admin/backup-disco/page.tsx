import { requireRole } from "@/lib/auth";
import { BackupEnDisco } from "@/components/BackupEnDisco";

export const metadata = { title: "Backup del sistema en disco — Ñandubay" };

export default async function BackupDiscoPage() {
  await requireRole("admin");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">
        Backup del sistema en disco
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        Guarda una copia completa en tu computadora: todas las tablas del
        sistema y todos los archivos cargados (firmas, planillas escaneadas y
        comprobantes). Es distinto del PDF de{" "}
        <b>Backups</b>, que sirve para leer o imprimir historias clínicas pero
        no para restaurar.
      </p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <BackupEnDisco />
      </div>

      <div className="mt-6 max-w-2xl rounded-2xl bg-yellow-soft/30 p-5 text-sm">
        <p className="font-bold text-green-dark">Dónde guardarlo</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/70">
          <li>
            Elegí una carpeta <b>fuera</b> de la carpeta del proyecto. Si la
            dejás adentro, la próxima subida de código publicaría historias
            clínicas reales.
          </li>
          <li>
            Sirve una carpeta como <code>D:\RODOLFO_2025\BACKUPS_NANDUBAY</code>,
            o directamente un disco externo.
          </li>
          <li>
            El contenido son datos de salud: guardalo con el mismo cuidado que
            las planillas en papel.
          </li>
        </ul>
      </div>
    </div>
  );
}
