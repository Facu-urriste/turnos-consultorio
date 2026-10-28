"use client";

import { useEffect, useState } from "react";
import type { DisponibilidadMes, EstadoDia } from "@/lib/types";
import { obtenerDisponibilidadMes } from "@/app/lib/api";
import { diasDelMes, formatoMesActual, nombreMesAnio, sumarMeses } from "@/app/lib/fecha";

const DIAS_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];

interface Props {
  onSeleccionarDia: (fecha: string) => void;
}

interface ResultadoMes {
  mes: string;
  datos: DisponibilidadMes | null;
  error: boolean;
}

export default function Calendario({ onSeleccionarDia }: Props) {
  const mesMinimo = formatoMesActual();
  const [mes, setMes] = useState(mesMinimo);
  // Guardamos el resultado junto con el mes al que corresponde: así "cargando"/"error"/"datos"
  // se derivan comparando contra el mes actual, en vez de resetear banderas a mano dentro del
  // efecto (eso dispara cascadas de renders y no es necesario: ver react-hooks/set-state-in-effect).
  const [resultado, setResultado] = useState<ResultadoMes | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerDisponibilidadMes(mes)
      .then((d) => {
        if (activo) setResultado({ mes, datos: d, error: false });
      })
      .catch(() => {
        if (activo) setResultado({ mes, datos: null, error: true });
      });
    return () => {
      activo = false;
    };
  }, [mes]);

  const vigente = resultado && resultado.mes === mes ? resultado : null;
  const cargando = vigente === null;
  const error = vigente?.error ?? false;
  const datos = vigente?.datos ?? null;

  const celdas = diasDelMes(mes);
  const hayDisponibleEsteMes = datos ? Object.values(datos.dias).some((e) => e === "disponible") : true;
  const puedeRetroceder = mes > mesMinimo;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setMes((m) => sumarMeses(m, -1))}
          disabled={!puedeRetroceder}
          className="rounded-full p-3 text-2xl text-stone-600 disabled:opacity-25"
        >
          ‹
        </button>
        <p className="text-lg font-semibold capitalize text-stone-900">{nombreMesAnio(mes)}</p>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setMes((m) => sumarMeses(m, 1))}
          className="rounded-full p-3 text-2xl text-stone-600"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-stone-400">
        {DIAS_CORTOS.map((letra, i) => (
          <div key={i}>{letra}</div>
        ))}
      </div>

      {cargando ? (
        <p className="py-10 text-center text-base text-stone-500">Buscando días disponibles...</p>
      ) : error ? (
        <p className="py-10 text-center text-base text-red-600">
          No pudimos cargar el calendario. Probá de nuevo más tarde.
        </p>
      ) : (
        <>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {celdas.map((celda, i) => {
              if (!celda) return <div key={`hueco-${i}`} />;
              const estado: EstadoDia = datos?.dias[celda.fecha] ?? "cerrado";
              const disponible = estado === "disponible";
              return (
                <button
                  key={celda.fecha}
                  type="button"
                  disabled={!disponible}
                  onClick={() => onSeleccionarDia(celda.fecha)}
                  className={
                    disponible
                      ? "aspect-square rounded-xl bg-primary-600 text-base font-semibold text-white transition active:scale-95 hover:bg-primary-700"
                      : "aspect-square rounded-xl text-base text-stone-300"
                  }
                >
                  {celda.numero}
                </button>
              );
            })}
          </div>
          {!hayDisponibleEsteMes && (
            <p className="mt-6 text-center text-base text-stone-500">
              No hay turnos disponibles este mes. Probá el mes que viene.
            </p>
          )}
        </>
      )}
    </div>
  );
}
