import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ResetearClaveButton } from "@/components/ResetearClaveButton";
import { crearTo, actualizarTo, cambiarEstadoTo, subirFotoTo } from "./actions";

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

async function archivoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null
) {
  if (!path) return null;
  const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export default async function EquipoTo() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: tos } = await supabase
    .from("tos")
    .select("id, nombre, dni, matricula, letra, frase_perfil, activo, usuario_id, foto_url, usuarios(usuario, email)")
    .order("nombre");

  const tosConFoto = await Promise.all(
    (tos ?? []).map(async (t) => ({
      ...t,
      fotoSignedUrl: await archivoUrl(supabase, t.foto_url),
    }))
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">Equipo TO</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {tosConFoto?.map((t) => (
          <Card key={t.id}>
            {/* La foto va como retrato circular al lado del nombre: un recorte
                apaisado de ancho completo cortaba las caras. Las TO sin foto
                muestran sus iniciales para que las fichas no queden desparejas. */}
            <div className="flex items-center gap-3">
              {t.fotoSignedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.fotoSignedUrl}
                  alt={`Foto de ${t.nombre}`}
                  className={`h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-green-light ${
                    t.activo ? "" : "grayscale"
                  }`}
                />
              ) : (
                <div
                  aria-hidden
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green-light/40 text-lg font-extrabold text-green-dark"
                >
                  {iniciales(t.nombre)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-green-dark">{t.nombre}</p>
                  {!t.activo && (
                    <span className="rounded-full bg-orange/15 px-2 py-0.5 text-xs font-bold text-orange">
                      Dada de baja
                    </span>
                  )}
                </div>
                {!t.fotoSignedUrl && (
                  <p className="text-xs text-foreground/50">Sin foto cargada</p>
                )}
              </div>
            </div>
            <p className="text-sm text-foreground/60">
              Usuario:{" "}
              <b>
                {/* @ts-expect-error relación anidada */}
                {t.usuarios?.usuario}
              </b>
            </p>
            <p className="text-sm text-foreground/60">
              Email:{" "}
              {/* @ts-expect-error relación anidada */}
              {t.usuarios?.email}
            </p>
            {t.letra && (
              <p className="text-sm text-foreground/60">
                Letra asignada: <b>{t.letra}</b> (pacientes {t.letra}0001...)
              </p>
            )}
            {t.dni && (
              <p className="text-sm text-foreground/60">DNI: {t.dni}</p>
            )}
            {t.matricula && (
              <p className="text-sm text-foreground/60">
                Matrícula: {t.matricula}
              </p>
            )}
            {t.frase_perfil && (
              <p className="mt-2 text-sm italic">&ldquo;{t.frase_perfil}&rdquo;</p>
            )}
            {t.usuario_id && <ResetearClaveButton usuarioId={t.usuario_id} />}

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-blue-mid">
                Editar datos
              </summary>
              <form action={actualizarTo} className="mt-2 grid gap-2">
                <input type="hidden" name="to_id" value={t.id} />
                <input
                  name="nombre"
                  defaultValue={t.nombre}
                  placeholder="Apellido y nombre"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
                <input
                  name="dni"
                  defaultValue={t.dni ?? ""}
                  placeholder="DNI"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
                <input
                  name="matricula"
                  defaultValue={t.matricula ?? ""}
                  placeholder="Matrícula"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
                <textarea
                  name="frase"
                  defaultValue={t.frase_perfil ?? ""}
                  rows={2}
                  placeholder="Frase de perfil"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-blue-mid"
                />
                <Button type="submit" variant="secondary" className="justify-self-start">
                  Guardar cambios
                </Button>
              </form>
            </details>

            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-blue-mid">
                {t.fotoSignedUrl ? "Cambiar foto" : "Subir foto"}
              </summary>
              <form action={subirFotoTo} className="mt-2 grid gap-2">
                <input type="hidden" name="to_id" value={t.id} />
                <input
                  type="file"
                  name="foto"
                  accept="image/jpeg,image/png,image/webp"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm"
                />
                <Button type="submit" variant="secondary" className="justify-self-start">
                  Subir foto
                </Button>
              </form>
            </details>

            <form action={cambiarEstadoTo} className="mt-2">
              <input type="hidden" name="to_id" value={t.id} />
              <input type="hidden" name="activo" value={(!t.activo).toString()} />
              <button
                type="submit"
                className={`text-xs font-semibold hover:underline ${t.activo ? "text-orange" : "text-green-mid"}`}
              >
                {t.activo ? "Dar de baja" : "Reactivar"}
              </button>
            </form>
          </Card>
        ))}
        {!tos?.length && (
          <p className="text-sm text-foreground/60">
            Todavía no hay TO cargadas.
          </p>
        )}
      </div>

      <h2 className="mt-10 font-bold text-green-dark">Invitar nueva TO</h2>
      <form action={crearTo} className="mt-4 grid max-w-md gap-4">
        <p className="text-sm font-bold text-foreground/70">Datos profesionales</p>
        <input
          required
          name="nombre"
          placeholder="Apellido y nombre"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
        />
        <input
          required
          name="dni"
          placeholder="DNI"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
        />
        <input
          name="matricula"
          placeholder="Número de matrícula (opcional)"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
        />
        <textarea
          name="frase"
          placeholder="Frase de perfil (opcional)"
          rows={2}
          className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
        />

        <p className="mt-2 text-sm font-bold text-foreground/70">Ingreso al sistema</p>
        <input
          required
          name="usuario"
          placeholder="Usuario de acceso (ej: RTERZAGHI)"
          autoCapitalize="none"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
        />
        <input
          required
          type="email"
          name="email"
          placeholder="Email (para enviarle la invitación)"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-blue-mid"
        />
        <p className="text-xs text-foreground/60">
          Va a ingresar al sistema con el usuario de arriba, no con el
          email. La clave de acceso no la definimos nosotros: le llega una
          invitación a ese email y ella misma la crea al aceptarla.
        </p>

        <Button type="submit" variant="primary" className="justify-self-start">
          Invitar TO
        </Button>
      </form>
    </div>
  );
}
