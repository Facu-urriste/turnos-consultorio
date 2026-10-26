"use client";

import { useEffect, useState } from "react";
import { obtenerDisponibilidadDia } from "@/app/lib/api";
import { formatFechaLarga } from "@/app/lib/fecha";

interface Props {
  fecha: string;
  onSeleccionarHora: (hora: string) => void;
  onVolver: () => void;
}

interface ResultadoDia {
  fecha: string;
  horarios: string[] | null;
  error: boolean;
}

export default function GrillaHorarios({ fecha, onSeleccionarHora, onVolver }: Props) {
  // Mismo patrón que en Calendario: el resultado se guarda junto con la fecha a la que
  // corresponde, y "cargando"/"error"/"horarios" se derivan comparando contra `fecha`.
  const [resultado, setResultado] = useState<ResultadoDia | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerDisponibilidadDia(fecha)
      .then((d) => {
        if (activo) setResultado({ fecha, horarios: d.horarios, error: false });
      })
      .catch(() => {
        if (activo) setResultado({ fecha, horarios: null, error: true });
      });
    return () => {
      activo = false;
    };
  }, [fecha]);

  const vigente = resultado && resultado.fecha === fecha ? resultado : null;
  const cargando = vigente === null;
  const error = vigente?.error ?? false;
  const horarios = vigente?.horarios ?? null;

  return (
    <div>
      <button type="button" onClick={onVolver} className="mb-4 text-base font-semibold text-teal-700">
        ‹ Volver al calendario
      </button>
      <h2 className="mb-5 text-xl font-semibold capitalize text-zinc-900">{formatFechaLarga(fecha)}</h2>

      {cargando ? (
        <p className="py-10 text-center text-base text-zinc-500">Buscando horarios...</p>
      ) : error ? (
        <p className="py-10 text-center text-base text-red-600">
          No pudimos cargar los horarios. Probá de nuevo.
        </p>
      ) : horarios && horarios.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {horarios.map((hora) => (
            <button
              key={hora}
              type="button"
              onClick={() => onSeleccionarHora(hora)}
              className="rounded-xl border-2 border-teal-600 py-4 text-lg font-semibold text-teal-700 transition active:scale-95 hover:bg-teal-50"
            >
              {hora}
            </button>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-base text-zinc-600">
          No quedan horarios este día, probá otro día.
        </p>
      )}
    </div>
  );
}
