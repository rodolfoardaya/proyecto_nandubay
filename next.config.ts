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
      bodySizeLimit: "31mb",
    },

    // El segundo tope, que es el que en realidad venía cortando las subidas.
    //
    // Como el proyecto tiene `proxy.ts`, Next copia el cuerpo de cada pedido a
    // memoria para poder leerlo dos veces, y eso lo limita aparte: 10 MB por
    // omisión. Pasado ese peso no devuelve un error, que sería lo manejable:
    // entrega el cuerpo cortado. El formulario llega mutilado, el servidor
    // falla con "Unexpected end of form" y la pantalla se cae con un número de
    // error, sin decir nunca que el archivo era grande.
    //
    // Va por encima de los otros dos topes para que el que actúe primero sea
    // el de la aplicación (MAXIMO_ARCHIVO_MB), que sí avisa qué pasó.
    proxyClientMaxBodySize: "35mb",
  },
};

export default nextConfig;
