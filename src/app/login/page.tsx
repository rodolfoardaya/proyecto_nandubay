import Image from "next/image";
import Link from "next/link";
import { PasswordInput } from "@/components/PasswordInput";
import { signIn } from "./actions";

export const metadata = { title: "Ingresar — Ñandubay" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-yellow-soft/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center">
          <Image
            src="/brand/logo.jpeg"
            alt="Ñandubay"
            width={72}
            height={72}
            className="rounded-full"
          />
          <h1 className="mt-4 text-xl font-extrabold text-green-dark">
            Ingresar a Ñandubay
          </h1>
        </div>

        <form action={signIn} className="mt-6 grid gap-4">
          <input
            required
            type="text"
            name="usuario"
            placeholder="Usuario"
            autoCapitalize="none"
            className="rounded-xl border border-black/10 px-4 py-3 outline-blue-mid"
          />
          <PasswordInput name="password" placeholder="Contraseña" />
          {error && (
            <p className="text-sm font-semibold text-orange">
              Usuario o contraseña incorrectos.
            </p>
          )}
          <button
            type="submit"
            className="rounded-full bg-green-mid py-3 font-bold text-white hover:bg-green-dark"
          >
            Ingresar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground/60">
          ¿Problemas para ingresar? Escribinos por WhatsApp al 3815821197.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="text-blue-mid hover:underline">
            ← Volver al sitio
          </Link>
        </p>
      </div>
    </main>
  );
}
