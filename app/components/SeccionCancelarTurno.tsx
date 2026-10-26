"use client";

import { useState } from "react";
import { cancelarTurno } from "@/app/lib/api";
import { mensajeErrorCancelacion } from "@/app/lib/mensajes";
import { consultorioPublico } from "@/app/lib/consultorioPublico";
import ModalConfirmarCancelacion from "./ModalConfirmarCancelacion";
import { claseBotonTexto } from "./ui";

interface Props {
  token: string;
  /** Texto ya formateado, ej: "del martes 4 a las 10:00". */
  descripcionTurno: string;
  puedeCancelar: boolean;
  onCancelado: () => void;
}

export default function SeccionCancelarTurno({ token, descripcionTurno, puedeCancelar, onCancelado }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setCancelando(true);
    setError(null);
    const resultado = await cancelarTurno(token);
    setCancelando(false);
    setModalAbierto(false);

    if (resultado.ok) {
      onCancelado();
      return;
    }
    setError(mensajeErrorCancelacion(resultado.error));
  }

  if (!puedeCancelar) {
    return (
      <div className="rounded-xl bg-zinc-100 p-4 text-base text-zinc-700">
        <p>Ya no se puede cancelar este turno por acá.</p>
        <p className="mt-1">
          Si necesitás hacer un cambio, llamanos al{" "}
          <a href={`tel:${consultorioPublico.telefonoHref}`} className="font-semibold underline">
            {consultorioPublico.telefono}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setModalAbierto(true)} className={claseBotonTexto}>
        Cancelar turno
      </button>

      {error && (
        <div role="alert" className="mt-3 rounded-xl bg-red-50 p-4 text-base text-red-700">
          <p>{error}</p>
        </div>
      )}

      <ModalConfirmarCancelacion
        abierto={modalAbierto}
        descripcionTurno={descripcionTurno}
        cargando={cancelando}
        onConfirmar={confirmar}
        onCerrar={() => setModalAbierto(false)}
      />
    </div>
  );
}
