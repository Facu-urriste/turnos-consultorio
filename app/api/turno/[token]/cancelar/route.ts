import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { config } from "@/config/config";
import { buscarEventoPorToken, eliminarEvento, esErrorRecursoInexistente } from "@/lib/calendar/cliente";
import type { CancelacionErrorCodigo } from "@/lib/types";

interface Contexto {
  params: Promise<{ token: string }>;
}

function respuestaError(error: CancelacionErrorCodigo, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function POST(_request: Request, { params }: Contexto) {
  const { token } = await params;

  try {
    const evento = await buscarEventoPorToken(token);
    if (!evento) {
      return respuestaError("NO_ENCONTRADO", 404);
    }

    const ahora = DateTime.now().setZone(config.zonaHoraria);
    if (ahora >= evento.fin) {
      return respuestaError("PASADO", 410);
    }

    const limite = ahora.plus({ hours: config.anticipacionMinimaCancelacionHoras });
    if (evento.inicio < limite) {
      return respuestaError("DEMASIADO_TARDE", 409);
    }

    try {
      await eliminarEvento(evento.id);
    } catch (err) {
      // Si ya no existe (lo borró el profesional a mano, o una cancelación concurrente ganó
      // la carrera), lo tratamos como "no encontrado" en vez de romper.
      if (esErrorRecursoInexistente(err)) {
        return respuestaError("NO_ENCONTRADO", 404);
      }
      throw err;
    }

    return NextResponse.json({ estado: "cancelado" });
  } catch (error) {
    console.error("Error al cancelar turno:", error instanceof Error ? error.message : "desconocido");
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
