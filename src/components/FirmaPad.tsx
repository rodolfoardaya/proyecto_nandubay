"use client";

import { useRef, useState } from "react";

// Firma manuscrita capturada en pantalla (firma electrónica simple, no
// firma digital certificada Ley 25.506). El trazo se serializa a PNG y
// viaja como dataURL en un input hidden con el resto del formulario.
export function FirmaPad({
  name,
  firmaActualUrl,
}: {
  name: string;
  firmaActualUrl?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dibujando = useRef(false);
  const [firmado, setFirmado] = useState(false);

  function posicion(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    dibujando.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = posicion(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = posicion(e);
    ctx.strokeStyle = "#1F6F4A";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    setFirmado(true);
  }

  function onPointerUp() {
    if (!dibujando.current) return;
    dibujando.current = false;
    if (inputRef.current && canvasRef.current) {
      inputRef.current.value = canvasRef.current.toDataURL("image/png");
    }
  }

  function limpiar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setFirmado(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <p className="text-xs font-semibold text-foreground/70">Firma de la TO</p>
      {firmaActualUrl && !firmado && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={firmaActualUrl}
          alt="Firma actual"
          className="mt-1 h-16 rounded-lg border border-black/10 bg-white"
        />
      )}
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="mt-1 touch-none rounded-xl border border-black/10 bg-white"
      />
      <button
        type="button"
        onClick={limpiar}
        className="mt-1 block text-xs font-semibold text-blue-mid hover:underline"
      >
        Limpiar firma
      </button>
      <input ref={inputRef} type="hidden" name={name} />
    </div>
  );
}
