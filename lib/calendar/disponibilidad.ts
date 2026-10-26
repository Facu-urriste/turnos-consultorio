import { DateTime } from "luxon";
import type { Corte } from "@/config/config";
import type { EstadoDia } from "@/lib/types";

/**
 * Intervalo de tiempo ocupado (ya resuelto, con zona horaria aplicada). No depende de Google
 * Calendar: lo construye la capa de I/O (lib/calendar/cliente.ts) a partir de los eventos reales,
 * y estas funciones puras solo lo usan para calcular superposiciones. Esto permite testear toda
 * la lógica de disponibilidad sin pegarle a la red.
 */
export interface Intervalo {
  inicio: DateTime;
  fin: DateTime;
}

function seSuperponen(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

/** Filtra los intervalos que superponen (parcial o totalmente) el rango [inicio, fin). */
export function eventosQueSuperponenRango(
  eventos: Intervalo[],
  inicio: DateTime,
  fin: DateTime
): Intervalo[] {
  return eventos.filter((ev) => seSuperponen(ev, { inicio, fin }));
}

function generarSlotsDelCorte(fecha: DateTime, corte: Corte, duracionMinutos: number): Intervalo[] {
  const [horaInicio, minInicio] = corte.inicio.split(":").map(Number);
  const [horaFin, minFin] = corte.fin.split(":").map(Number);

  const finCorte = fecha.set({ hour: horaFin, minute: minFin, second: 0, millisecond: 0 });
  let cursor = fecha.set({ hour: horaInicio, minute: minInicio, second: 0, millisecond: 0 });

  const slots: Intervalo[] = [];
  for (;;) {
    const finSlot = cursor.plus({ minutes: duracionMinutos });
    if (finSlot > finCorte) break;
    slots.push({ inicio: cursor, fin: finSlot });
    cursor = finSlot;
  }
  return slots;
}

/**
 * Calcula los horarios de inicio ("HH:mm") libres de un día, dados sus cortes configurados,
 * la duración del turno, los intervalos ya ocupados (de Google Calendar u otra fuente) y la
 * anticipación mínima requerida para reservar. No hace ninguna llamada de red: todo lo que
 * necesita ya le llega resuelto, por lo que es trivial de testear.
 */
export function calcularHorariosLibres(params: {
  /** Cualquier DateTime del día en cuestión, en la zona horaria del consultorio (se normaliza con set()). */
  fecha: DateTime;
  cortes: Corte[];
  duracionMinutos: number;
  eventosOcupados: Intervalo[];
  ahora: DateTime;
  anticipacionMinimaHoras: number;
}): string[] {
  const { fecha, cortes, duracionMinutos, eventosOcupados, ahora, anticipacionMinimaHoras } = params;
  const limiteAnticipacion = ahora.plus({ hours: anticipacionMinimaHoras });

  const libres: string[] = [];
  for (const corte of cortes) {
    const slots = generarSlotsDelCorte(fecha, corte, duracionMinutos);
    for (const slot of slots) {
      if (slot.inicio < limiteAnticipacion) continue;
      const ocupado = eventosOcupados.some((ev) => seSuperponen(slot, ev));
      if (ocupado) continue;
      libres.push(slot.inicio.toFormat("HH:mm"));
    }
  }
  return libres;
}

/**
 * Calcula el EstadoDia de un día puntual, siguiendo el orden de reglas del contrato:
 * pasado > fuera-de-horizonte > cerrado > completo/disponible.
 */
export function calcularEstadoDia(params: {
  /** Cualquier DateTime del día en cuestión, en la zona horaria del consultorio. */
  fecha: DateTime;
  cortes: Corte[];
  duracionMinutos: number;
  eventosOcupados: Intervalo[];
  ahora: DateTime;
  anticipacionMinimaHoras: number;
  horizonteReservaSemanas: number;
}): EstadoDia {
  const { fecha, cortes, ahora, horizonteReservaSemanas } = params;

  const inicioDeHoy = ahora.startOf("day");
  const inicioDelDia = fecha.startOf("day");

  if (inicioDelDia < inicioDeHoy) return "pasado";

  const limiteHorizonte = inicioDeHoy.plus({ weeks: horizonteReservaSemanas });
  if (inicioDelDia > limiteHorizonte) return "fuera-de-horizonte";

  if (cortes.length === 0) return "cerrado";

  const libres = calcularHorariosLibres(params);
  return libres.length > 0 ? "disponible" : "completo";
}
