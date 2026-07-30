"use client";

import { useState } from "react";

export function PasswordInput({
  name,
  placeholder,
}: {
  name: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        required
        type={visible ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 px-4 py-3 pr-16 outline-blue-mid"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-mid hover:underline"
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
