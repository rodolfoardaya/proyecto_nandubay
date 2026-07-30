"use client";

import Link from "next/link";
import { useState } from "react";

type Paciente = {
  id: string;
  numero_registro: string;
  nombre: string;
  dni: string | null;
  tipo: string;
};

// Listado tabular de pacientes ordenado por número de registro, con los
// datos principales a simple vista (apellido y nombre, DNI, tipo) y
// selección para imprimir las planillas + historia clínica de varios a la
// vez (usa el mismo endpoint de backup en PDF).
export function TablaPacientes({ pacientes, base }: { pacientes: Paciente[]; base: string }) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  if (!pacientes.length) {
    return <p className="text-sm text-foreground/60">Todavía no hay pacientes cargados.</p>;
  }

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setSeleccionados((prev) =>
      prev.size === pacientes.length ? new Set() : new Set(pacientes.map((p) => p.id))
    );
  }

  const hrefImprimir = `/api/backup?paciente_ids=${Array.from(seleccionados).join(",")}`;

  return (
    <div>
      {seleccionados.size > 0 && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-yellow-soft/30 px-4 py-2 text-sm">
          <span>
            {seleccionados.size} paciente{seleccionados.size === 1 ? "" : "s"} seleccionado
            {seleccionados.size === 1 ? "" : "s"}
          </span>
          <a
            href={hrefImprimir}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-blue-mid hover:underline"
          >
            Imprimir seleccionados (PDF)
          </a>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs font-bold uppercase text-foreground/50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={seleccionados.size === pacientes.length}
                  onChange={toggleTodos}
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Apellido y Nombre</th>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {pacientes.map((p) => (
              <tr key={p.id} className="hover:bg-green-light/10">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Seleccionar ${p.nombre}`}
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-foreground/70">
                  <Link href={`${base}/${p.id}`} className="hover:underline">
                    {p.numero_registro}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`${base}/${p.id}`} className="font-bold text-green-dark hover:underline">
                    {p.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground/70">{p.dni ?? "—"}</td>
                <td className="px-4 py-3 capitalize text-foreground/70">{p.tipo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
