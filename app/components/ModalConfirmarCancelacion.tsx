"use client";

import { claseBotonPeligro, claseBotonTexto } from "./ui";

interface Props {
  abierto: boolean;
  descripcionTurno: string;
  cargando: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
}

export default function ModalConfirmarCancelacion({
  abierto,
  descripcionTurno,
  cargando,
  onConfirmar,
  onCerrar,
}: Props) {
  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-cancelar"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p id="titulo-modal-cancelar" className="mb-6 text-lg text-zinc-900">
          ¿Seguro que querés cancelar el turno {descripcionTurno}?
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" disabled={cargando} onClick={onConfirmar} className={claseBotonPeligro}>
            {cargando ? "Cancelando..." : "Sí, cancelar turno"}
          </button>
          <button type="button" disabled={cargando} onClick={onCerrar} className={claseBotonTexto}>
            No, volver
          </button>
        </div>
      </div>
    </div>
  );
}
