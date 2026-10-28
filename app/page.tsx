"use client";

import { useState } from "react";
import type { TurnoDetalle } from "@/lib/types";
import Encabezado from "./components/Encabezado";
import Calendario from "./components/Calendario";
import GrillaHorarios from "./components/GrillaHorarios";
import FormularioReserva from "./components/FormularioReserva";
import PantallaConfirmacion from "./components/PantallaConfirmacion";
import { claseBotonPrimario } from "./components/ui";

type Paso =
  | { tipo: "calendario" }
  | { tipo: "horarios"; fecha: string }
  | { tipo: "formulario"; fecha: string; hora: string }
  | { tipo: "confirmacion"; turno: TurnoDetalle }
  | { tipo: "cancelado" };

export default function Home() {
  const [paso, setPaso] = useState<Paso>({ tipo: "calendario" });

  return (
    <>
      <Encabezado subtitulo={paso.tipo === "calendario" || paso.tipo === "horarios" ? "Reservá tu turno" : undefined} />

      <main className="flex-1">
        {paso.tipo === "calendario" && (
          <Calendario onSeleccionarDia={(fecha) => setPaso({ tipo: "horarios", fecha })} />
        )}

        {paso.tipo === "horarios" && (
          <GrillaHorarios
            fecha={paso.fecha}
            onVolver={() => setPaso({ tipo: "calendario" })}
            onSeleccionarHora={(hora) => setPaso({ tipo: "formulario", fecha: paso.fecha, hora })}
          />
        )}

        {paso.tipo === "formulario" && (
          <FormularioReserva
            fecha={paso.fecha}
            hora={paso.hora}
            onVolver={() => setPaso({ tipo: "horarios", fecha: paso.fecha })}
            onSlotTomado={() => setPaso({ tipo: "horarios", fecha: paso.fecha })}
            onReservado={(turno) => setPaso({ tipo: "confirmacion", turno })}
          />
        )}

        {paso.tipo === "confirmacion" && (
          <PantallaConfirmacion turno={paso.turno} onCancelado={() => setPaso({ tipo: "cancelado" })} />
        )}

        {paso.tipo === "cancelado" && (
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <p className="text-xl font-semibold text-stone-900">Tu turno fue cancelado.</p>
            <button type="button" onClick={() => setPaso({ tipo: "calendario" })} className={claseBotonPrimario}>
              Sacar un nuevo turno
            </button>
          </div>
        )}
      </main>
    </>
  );
}
