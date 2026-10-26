import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { config } from "@/config/config";
import { buscarEventoPorToken } from "@/lib/calendar/cliente";
import type { TurnoConsulta } from "@/lib/types";

interface Contexto {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: Contexto) {
  const { token } = await params;

  try {
    const evento = await buscarEventoPorToken(token);
    if (!evento) {
      const body: TurnoConsulta = { estado: "no-encontrado" };
      return NextResponse.json(body);
    }

    const ahora = DateTime.now().setZone(config.zonaHoraria);
    const turno = {
      nombre: evento.nombre,
      fecha: evento.inicio.toFormat("yyyy-MM-dd"),
      horaInicio: evento.inicio.toFormat("HH:mm"),
      horaFin: evento.fin.toFormat("HH:mm"),
      inicioISO: evento.inicio.toISO() ?? "",
      finISO: evento.fin.toISO() ?? "",
      mensaje: evento.mensaje,
    };

    if (ahora >= evento.fin) {
      const body: TurnoConsulta = { estado: "pasado", turno };
      return NextResponse.json(body);
    }

    const puedeCancelar = evento.inicio >= ahora.plus({ hours: config.anticipacionMinimaCancelacionHoras });
    const body: TurnoConsulta = { estado: "activo", turno, puedeCancelar };
    return NextResponse.json(body);
  } catch (error) {
    // Nunca devolvemos un 404/500 llano para esta ruta: si algo falla, la respuesta más
    // segura (y la que exige el contrato) sigue siendo un 200 con el estado que mejor aplique.
    console.error("Error al consultar turno:", error instanceof Error ? error.message : "desconocido");
    const body: TurnoConsulta = { estado: "no-encontrado" };
    return NextResponse.json(body);
  }
}
