import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Diagnóstico de conectividad para el servidor donde está desplegada la app.
// No devuelve ninguna clave: sólo si están presentes y qué pasa al intentar
// hablar con Supabase. Sirve para distinguir "credenciales mal cargadas" de
// "el servidor no puede salir a internet".
export const dynamic = "force-dynamic";

type Detalle = {
  ok: boolean;
  status?: number;
  error?: string;
  causa?: string;
  codigo?: string;
  ms: number;
};

async function probar(url: string, headers: Record<string, string> = {}): Promise<Detalle> {
  const inicio = Date.now();
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    return { ok: res.ok, status: res.status, ms: Date.now() - inicio };
  } catch (e) {
    const err = e as Error & { cause?: { message?: string; code?: string } };
    return {
      ok: false,
      error: err.message,
      causa: err.cause?.message,
      codigo: err.cause?.code,
      ms: Date.now() - inicio,
    };
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const variables = {
    NEXT_PUBLIC_SUPABASE_URL: url ?? null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? `presente (${anon.length} caracteres)` : "FALTA",
    SUPABASE_SERVICE_ROLE_KEY: service ? `presente (${service.length} caracteres)` : "FALTA",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "presente" : "FALTA",
  };

  const pruebas: Record<string, Detalle | string | Record<string, unknown>> = {};

  // 1. ¿Sale a internet en general?
  pruebas.internet = await probar("https://api.github.com/zen");

  // 2. ¿Llega al host de Supabase?
  if (url) {
    pruebas.supabase_raiz = await probar(`${url}/rest/v1/`, { apikey: anon ?? "" });
    pruebas.supabase_auth = await probar(`${url}/auth/v1/health`, { apikey: anon ?? "" });
    pruebas.supabase_consulta = await probar(
      `${url}/rest/v1/usuarios?select=usuario&limit=1`,
      { apikey: anon ?? "" }
    );
  } else {
    pruebas.supabase_raiz = "no se puede probar: falta NEXT_PUBLIC_SUPABASE_URL";
  }

  // 3. El camino que usa el login: service role key. Hasta ahora sólo se había
  // probado la anon key, que es otra credencial y otro cliente.
  if (url) {
    pruebas.service_role_fetch = await probar(
      `${url}/rest/v1/usuarios?select=usuario&limit=1`,
      { apikey: service ?? "", Authorization: `Bearer ${service ?? ""}` }
    );
  }

  // 4. Exactamente lo que hace resolverEmail(): mismo cliente, misma consulta.
  const inicioAdmin = Date.now();
  let loginQuery: Record<string, unknown>;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("usuarios")
      .select("usuario")
      .eq("usuario", "RARDAYA")
      .maybeSingle();
    loginQuery = {
      ok: !error,
      encontro_usuario: !!data,
      error: error?.message ?? null,
      detalle: error?.details ?? null,
      hint: error?.hint ?? null,
      codigo: error?.code ?? null,
      ms: Date.now() - inicioAdmin,
    };
  } catch (e) {
    const err = e as Error & { cause?: { message?: string; code?: string } };
    loginQuery = {
      ok: false,
      excepcion: err.message,
      causa: err.cause?.message ?? null,
      codigo: err.cause?.code ?? null,
      ms: Date.now() - inicioAdmin,
    };
  }
  pruebas.como_lo_hace_el_login = loginQuery;

  // Lo que rompe el login: el self-fetch que hace Next para resolver el
  // redirect() de una Server Action. Se prueban los dos orígenes posibles.
  const g = globalThis as Record<string, unknown>;
  const puerto = process.env.PORT || "3000";
  const origenActual = process.env.__NEXT_PRIVATE_ORIGIN ?? "(sin definir)";

  const selfFetch: Record<string, Detalle> = {
    loopback: await probar(`http://127.0.0.1:${puerto}/login`),
  };
  if (origenActual.startsWith("http")) {
    selfFetch.origen_actual = await probar(`${origenActual}/login`);
  }
  selfFetch.dominio_publico = await probar("https://espacionandubay.com/login");

  return NextResponse.json(
    {
      version: "5-service-role",
      nodo: process.version,
      instrumentation: {
        register_corrio: g.__nandubay_register_ok === true,
        origen_antes: g.__nandubay_origen_previo ?? "(register no corrió)",
        origen_ahora: origenActual,
        PORT: process.env.PORT ?? "(sin definir)",
      },
      self_fetch: selfFetch,
      variables,
      pruebas,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
