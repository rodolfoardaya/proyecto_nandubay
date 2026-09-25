import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next limita el cuerpo de una Server Action a 1 MB. Todas las subidas del
      // sistema van por ese camino —estudios, fichas escaneadas, acuerdos
      // firmados, facturas, fotos— y ningún PDF escaneado entra en 1 MB: un
      // estudio de pocas páginas pesa entre 3 y 10 MB. Con el tope por defecto
      // la carga fallaba siempre, y encima sin decir por qué.
      //
      // El tope va un megabyte por encima del que aplica la aplicación
      // (MAXIMO_ARCHIVO_MB), a propósito: así un archivo apenas pasado de la
      // medida llega hasta el servidor y recibe un mensaje que se entiende, en
      // vez de chocar contra el límite de Next y morir sin explicación.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
