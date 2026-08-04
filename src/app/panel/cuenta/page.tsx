import { requireRole } from "@/lib/auth";
import { CambiarClaveForm } from "@/components/CambiarClaveForm";

export const metadata = { title: "Mi cuenta — Ñandubay" };

// Accesible para cualquiera que tenga sesión: cada uno cambia su propia clave
// sin depender del admin ni de que llegue ningún mail.
export default async function MiCuenta() {
  const usuario = await requireRole();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-green-dark">Mi cuenta</h1>

      <div className="mt-6 max-w-md rounded-2xl bg-white p-5 shadow-sm">
        <p className="font-semibold text-green-dark">{usuario.nombre}</p>
        <p className="text-sm text-foreground/60">{usuario.email}</p>
        <p className="mt-1 text-sm capitalize text-foreground/60">
          Rol: {usuario.rol}
        </p>
      </div>

      <div className="mt-6 max-w-md rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-green-dark">Cambiar mi clave</h2>
        <p className="mt-1 mb-4 text-sm text-foreground/60">
          Si entraste con una clave provisoria que te dieron, cambiala por una
          tuya.
        </p>
        <CambiarClaveForm />
      </div>
    </div>
  );
}
