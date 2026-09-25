// Tamaño máximo de cualquier archivo que suba el sistema.
//
// Tiene que quedar por debajo del `serverActions.bodySizeLimit` de
// next.config.ts: ese margen es lo que permite que un archivo apenas pasado de
// medida llegue hasta el servidor y reciba un mensaje que se entiende, en vez
// de chocar contra el límite de Next y morir sin explicación.
export const MAXIMO_ARCHIVO_MB = 15;

export function excedeElMaximo(bytes: number): boolean {
  return bytes > MAXIMO_ARCHIVO_MB * 1024 * 1024;
}

export function mensajeArchivoGrande(bytes: number): string {
  const pesa = (bytes / 1024 / 1024).toFixed(1);
  return (
    `El archivo pesa ${pesa} MB y el máximo es ${MAXIMO_ARCHIVO_MB} MB. ` +
    "Si es un escaneo, volvé a escanearlo en menor calidad o dividilo en partes."
  );
}
