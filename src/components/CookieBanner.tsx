"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "nandubay-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  function choose(value: "accepted" | "rejected") {
    localStorage.setItem(KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-green-dark text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-4 text-sm md:flex-row md:justify-between">
        <p>
          Usamos cookies para mejorar tu experiencia. Podés aceptarlas o
          rechazar las no esenciales.{" "}
          <Link href="/politica-de-cookies" className="underline">
            Más información
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("rejected")}
            className="rounded-full border border-white/40 px-4 py-2 font-semibold hover:bg-white/10"
          >
            Rechazar
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-full bg-yellow-main px-4 py-2 font-bold text-[#1c4d4f] hover:brightness-95"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
