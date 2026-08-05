"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";

const MINUTOS = 60;
const LIMITE = MINUTOS * 60 * 1000;
const AVISO_ANTES = 60 * 1000; // Un minuto antes se avisa.

// Cierra la sesión sola tras una hora sin actividad. En un sistema con
// historias clínicas, un panel abierto y desatendido es una historia clínica
// expuesta.
export function CierrePorInactividad() {
  const [restan, setRestan] = useState<number | null>(null);
  const ultima = useRef(Date.now());

  useEffect(() => {
    const marcar = () => {
      ultima.current = Date.now();
      setRestan(null);
    };

    const eventos = ["mousedown", "keydown", "scroll", "touchstart", "visibilitychange"];
    for (const e of eventos) window.addEventListener(e, marcar, { passive: true });

    const reloj = setInterval(() => {
      const inactivo = Date.now() - ultima.current;
      if (inactivo >= LIMITE) {
        clearInterval(reloj);
        void signOut();
      } else if (inactivo >= LIMITE - AVISO_ANTES) {
        setRestan(Math.ceil((LIMITE - inactivo) / 1000));
      }
    }, 5000);

    return () => {
      clearInterval(reloj);
      for (const e of eventos) window.removeEventListener(e, marcar);
    };
  }, []);

  if (restan === null) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-orange px-5 py-3 text-sm font-bold text-white shadow-lg">
      Por seguridad, la sesión se va a cerrar en {restan} segundos.
      <span className="ml-2 font-normal">Movés el mouse y seguís.</span>
    </div>
  );
}
