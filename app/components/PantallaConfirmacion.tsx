"use client";

import { useSyncExternalStore } from "react";
import type { TurnoDetalle } from "@/lib/types";
import { formatDescripcionCorta } from "@/app/lib/fecha";
import { consultorioPublico } from "@/app/lib/consultorioPublico";
import DetalleTurno from "./DetalleTurno";
import BotonesAgregarCalendario from "./BotonesAgregarCalendario";
import BotonesCompartir from "./BotonesCompartir";
import SeccionCancelarTurno from "./SeccionCancelarTurno";

interface Props {
  turno: TurnoDetalle;
  onCancelado: () => void;
}

// Sin suscripción real: `window.location.origin` no cambia mientras la página está montada.
function sinSuscripcion() {
  return () => {};
}

export default function PantallaConfirmacion({ turno, onCancelado }: Props) {
  // Igual que en BotonesCompartir: useSyncExternalStore da el valor del servidor (vacío) en la
  // primera pasada y el real del navegador después de montar, sin necesitar un efecto con
  // setState.
  const urlTurno = useSyncExternalStore(
    sinSuscripcion,
    () => `${window.location.origin}/turno/${turno.token}`,
    () => "",
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-center text-2xl font-semibold text-teal-700">¡Turno confirmado!</p>

      <DetalleTurno inicioISO={turno.inicioISO} />

      <BotonesAgregarCalendario token={turno.token} inicioISO={turno.inicioISO} finISO={turno.finISO} />

      <div className="rounded-xl bg-zinc-50 p-4">
        <p className="text-base text-zinc-700">Si necesitás cancelar, volvé a entrar a este link.</p>
        {urlTurno && <BotonesCompartir url={urlTurno} texto="Mi turno" />}
      </div>

      <SeccionCancelarTurno
        token={turno.token}
        descripcionTurno={formatDescripcionCorta(turno.inicioISO)}
        puedeCancelar={true}
        onCancelado={onCancelado}
      />

      <p className="text-center text-sm text-zinc-500">
        También podés llamarnos al{" "}
        <a href={`tel:${consultorioPublico.telefonoHref}`} className="font-semibold underline">
          {consultorioPublico.telefono}
        </a>
        .
      </p>
    </div>
  );
}
