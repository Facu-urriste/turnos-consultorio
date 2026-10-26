import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { config, diaSemanaDesdeLuxonWeekday } from "@/config/config";
import {
  calcularEstadoDia,
  calcularHorariosLibres,
  eventosQueSuperponenRango,
} from "@/lib/calendar/disponibilidad";
import { obtenerEventosOcupados } from "@/lib/calendar/cliente";
import type { DisponibilidadDia, DisponibilidadMes, EstadoDia } from "@/lib/types";

const REGEX_MES = /^\d{4}-\d{2}$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fechaParam = searchParams.get("fecha");
  const mesParam = searchParams.get("mes");

  try {
    if (fechaParam) return await responderFecha(fechaParam);
    if (mesParam) return await responderMes(mesParam);
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  } catch (error) {
    console.error("Error al calcular disponibilidad:", error instanceof Error ? error.message : "desconocido");
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

async function responderFecha(fechaParam: string): Promise<NextResponse> {
  if (!REGEX_FECHA.test(fechaParam)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const inicioDelDia = DateTime.fromISO(fechaParam, { zone: config.zonaHoraria }).startOf("day");
  if (!inicioDelDia.isValid) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const ahora = DateTime.now().setZone(config.zonaHoraria);
  const diaSemana = diaSemanaDesdeLuxonWeekday(inicioDelDia.weekday);
  const cortes = config.horarios[diaSemana];

  const finDelDia = inicioDelDia.plus({ days: 1 });
  const eventosOcupados = await obtenerEventosOcupados(inicioDelDia, finDelDia);

  const horarios = calcularHorariosLibres({
    fecha: inicioDelDia,
    cortes,
    duracionMinutos: config.duracionTurnoMinutos,
    eventosOcupados,
    ahora,
    anticipacionMinimaHoras: config.anticipacionMinimaReservaHoras,
  });

  const body: DisponibilidadDia = { fecha: fechaParam, horarios };
  return NextResponse.json(body);
}

async function responderMes(mesParam: string): Promise<NextResponse> {
  if (!REGEX_MES.test(mesParam)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const inicioMes = DateTime.fromISO(`${mesParam}-01`, { zone: config.zonaHoraria }).startOf("day");
  if (!inicioMes.isValid) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const ahora = DateTime.now().setZone(config.zonaHoraria);
  const cantidadDias = inicioMes.daysInMonth ?? 30;
  const finMes = inicioMes.plus({ days: cantidadDias });

  const eventosOcupados = await obtenerEventosOcupados(inicioMes, finMes);

  const dias: Record<string, EstadoDia> = {};
  for (let i = 0; i < cantidadDias; i++) {
    const dia = inicioMes.plus({ days: i });
    const diaSemana = diaSemanaDesdeLuxonWeekday(dia.weekday);
    const cortes = config.horarios[diaSemana];
    const eventosDelDia = eventosQueSuperponenRango(eventosOcupados, dia, dia.plus({ days: 1 }));

    dias[dia.toFormat("yyyy-MM-dd")] = calcularEstadoDia({
      fecha: dia,
      cortes,
      duracionMinutos: config.duracionTurnoMinutos,
      eventosOcupados: eventosDelDia,
      ahora,
      anticipacionMinimaHoras: config.anticipacionMinimaReservaHoras,
      horizonteReservaSemanas: config.horizonteReservaSemanas,
    });
  }

  const body: DisponibilidadMes = { mes: mesParam, dias };
  return NextResponse.json(body);
}
