"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// Tipos mínimos de la File System Access API: todavía no están en las
// definiciones estándar de TypeScript.
type Escribible = { write(dato: unknown): Promise<void>; close(): Promise<void> };
type ArchivoHandle = { createWritable(): Promise<Escribible> };
type CarpetaHandle = {
  name: string;
  getDirectoryHandle(nombre: string, opciones?: { create?: boolean }): Promise<CarpetaHandle>;
  getFileHandle(nombre: string, opciones?: { create?: boolean }): Promise<ArchivoHandle>;
};

type Respuesta = {
  generado_el: string;
  generado_por: string;
  tablas: Record<string, unknown[]>;
  archivos: { bucket: string; ruta: string; url: string }[];
  errores: Record<string, string> | null;
};

function sellioDeTiempo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

async function subcarpeta(raiz: CarpetaHandle, partes: string[]) {
  let dir = raiz;
  for (const parte of partes) {
    dir = await dir.getDirectoryHandle(parte, { create: true });
  }
  return dir;
}

async function escribir(dir: CarpetaHandle, nombre: string, contenido: Blob | string) {
  const handle = await dir.getFileHandle(nombre, { create: true });
  const w = await handle.createWritable();
  await w.write(contenido);
  await w.close();
}

function resumen(datos: Respuesta) {
  const lineas = [
    "BACKUP DEL SISTEMA ÑANDUBAY",
    "",
    `Generado: ${new Date(datos.generado_el).toLocaleString("es-AR")}`,
    `Por: ${datos.generado_por}`,
    "",
    "CONTENIDO",
    "  datos/        una copia de cada tabla en formato JSON",
    "  documentos/   firmas y planillas escaneadas",
    "  facturas/     comprobantes de facturación",
    "",
    "REGISTROS POR TABLA",
    ...Object.entries(datos.tablas).map(([t, filas]) => `  ${t}: ${filas.length}`),
    "",
    `ARCHIVOS: ${datos.archivos.length}`,
    "",
    "Esta carpeta contiene historias clínicas reales. Guardala en un lugar",
    "seguro y no la subas a ningún repositorio ni servicio compartido.",
  ];
  if (datos.errores) {
    lineas.push("", "TABLAS CON ERROR (revisar):");
    for (const [t, e] of Object.entries(datos.errores)) lineas.push(`  ${t}: ${e}`);
  }
  return lineas.join("\n");
}

export function BackupEnDisco() {
  const [estado, setEstado] = useState<"listo" | "trabajando" | "ok" | "error">("listo");
  const [paso, setPaso] = useState("");
  const [detalle, setDetalle] = useState("");

  const soportaCarpeta =
    typeof window !== "undefined" && "showDirectoryPicker" in window;

  async function guardar() {
    setEstado("trabajando");
    setDetalle("");

    try {
      // El selector de carpeta exige que lo dispare un clic, así que va
      // antes de cualquier await largo.
      let raiz: CarpetaHandle | null = null;
      if (soportaCarpeta) {
        const picker = (window as unknown as {
          showDirectoryPicker: (o?: { mode?: string }) => Promise<CarpetaHandle>;
        }).showDirectoryPicker;
        raiz = await picker({ mode: "readwrite" });
      }

      setPaso("Pidiendo los datos al servidor...");
      const res = await fetch("/api/backup-disco", { cache: "no-store" });
      if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
      const datos: Respuesta = await res.json();

      const nombreCarpeta = `nandubay-backup-${sellioDeTiempo()}`;
      const total = datos.archivos.length;

      if (raiz) {
        const destino = await subcarpeta(raiz, [nombreCarpeta]);

        setPaso("Guardando los datos...");
        const carpetaDatos = await subcarpeta(destino, ["datos"]);
        for (const [tabla, filas] of Object.entries(datos.tablas)) {
          await escribir(carpetaDatos, `${tabla}.json`, JSON.stringify(filas, null, 2));
        }
        await escribir(destino, "LEEME.txt", resumen(datos));

        let hechos = 0;
        let fallados = 0;
        for (const archivo of datos.archivos) {
          hechos++;
          setPaso(`Guardando archivos... ${hechos} de ${total}`);
          try {
            const r = await fetch(archivo.url);
            if (!r.ok) throw new Error(String(r.status));
            const partes = archivo.ruta.split("/");
            const nombre = partes.pop()!;
            const dir = await subcarpeta(destino, [archivo.bucket, ...partes]);
            await escribir(dir, nombre, await r.blob());
          } catch {
            fallados++;
          }
        }

        setEstado("ok");
        setPaso(`Backup guardado en la carpeta ${nombreCarpeta}`);
        setDetalle(
          `${Object.values(datos.tablas).reduce((n, t) => n + t.length, 0)} registros y ${total - fallados} archivos` +
            (fallados ? ` · ${fallados} archivo(s) no se pudieron bajar` : "")
        );
        return;
      }

      // Navegador sin selector de carpeta: se arma un ZIP y se descarga.
      setPaso("Armando el archivo comprimido...");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const [tabla, filas] of Object.entries(datos.tablas)) {
        zip.file(`${nombreCarpeta}/datos/${tabla}.json`, JSON.stringify(filas, null, 2));
      }
      zip.file(`${nombreCarpeta}/LEEME.txt`, resumen(datos));

      let hechos = 0;
      let fallados = 0;
      for (const archivo of datos.archivos) {
        hechos++;
        setPaso(`Agregando archivos... ${hechos} de ${total}`);
        try {
          const r = await fetch(archivo.url);
          if (!r.ok) throw new Error(String(r.status));
          zip.file(`${nombreCarpeta}/${archivo.bucket}/${archivo.ruta}`, await r.blob());
        } catch {
          fallados++;
        }
      }

      setPaso("Comprimiendo...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nombreCarpeta}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setEstado("ok");
      setPaso(`Se descargó ${nombreCarpeta}.zip`);
      setDetalle(fallados ? `${fallados} archivo(s) no se pudieron bajar` : "");
    } catch (e) {
      const err = e as Error;
      // Cerrar el selector de carpeta no es un error que valga la pena mostrar.
      if (err.name === "AbortError") {
        setEstado("listo");
        setPaso("");
        return;
      }
      setEstado("error");
      setPaso("No se pudo completar el backup");
      setDetalle(err.message);
    }
  }

  return (
    <div className="max-w-2xl">
      <Button onClick={guardar} variant="primary" disabled={estado === "trabajando"}>
        {estado === "trabajando"
          ? "Guardando..."
          : soportaCarpeta
            ? "Elegir carpeta y guardar backup"
            : "Descargar backup (ZIP)"}
      </Button>

      {!soportaCarpeta && estado === "listo" && (
        <p className="mt-3 text-sm text-foreground/60">
          Tu navegador no permite elegir la carpeta. El backup se va a descargar
          como un único archivo ZIP. Si preferís elegir dónde se guarda, usá
          Chrome o Edge.
        </p>
      )}

      {paso && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            estado === "error"
              ? "bg-orange/10 text-orange"
              : estado === "ok"
                ? "bg-green-light/30 text-green-dark"
                : "bg-blue-light/20 text-foreground/80"
          }`}
        >
          <p className="font-semibold">{paso}</p>
          {detalle && <p className="mt-1 text-xs">{detalle}</p>}
        </div>
      )}
    </div>
  );
}
