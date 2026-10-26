import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { config, diaSemanaDesdeLuxonWeekday } from "@/config/config";
import { normalizarTelefonoAR } from "@/lib/telefono";
import { generarTokenTurno } from "@/lib/token";
import {
  contarEventosFuturosPorTelefono,
  crearEvento,
  obtenerEventosOcupados,
  SlotOcupadoError,
} from "@/lib/calendar/cliente";
import { eventosQueSuperponenRango } from "@/lib/calendar/disponibilidad";
import { obtenerIpDesdeHeaders, permitirReserva } from "@/lib/rateLimit";
import type { ReservaErrorCodigo, ReservaInput, TurnoDetalle } from "@/lib/types";

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^\d{2}:\d{2}$/;
const LARGO_MAXIMO_NOMBRE = 120;
const LARGO_MAXIMO_MENSAJE = 200;

function respuestaError(error: ReservaErrorCodigo, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const ip = obtenerIpDesdeHeaders(request.headers);
    const permitido = await permitirReserva(ip);
    if (!permitido) return respuestaError("RATE_LIMITED", 429);

    let body: ReservaInput;
    try {
      body = await request.json();
    } catch {
      return respuestaError("INVALID_INPUT", 422);
    }
    if (!body || typeof body !== "object") {
      return respuestaError("INVALID_INPUT", 422);
    }

    // El honeypot debe llegar vacío; si no, se trata como error de validación sin dar pistas.
    if (typeof body.honeypot === "string" && body.honeypot.trim() !== "") {
      return respuestaError("HONEYPOT", 422);
    }

    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const mensaje = typeof body.mensaje === "string" ? body.mensaje.trim() : "";
    const fecha = typeof body.fecha === "string" ? body.fecha : "";
    const horaInicio = typeof body.horaInicio === "string" ? body.horaInicio : "";

    if (!nombre || nombre.length > LARGO_MAXIMO_NOMBRE) {
      return respuestaError("INVALID_INPUT", 422);
    }
    if (mensaje.length > LARGO_MAXIMO_MENSAJE) {
      return respuestaError("INVALID_INPUT", 422);
    }
    if (!REGEX_FECHA.test(fecha) || !REGEX_HORA.test(horaInicio)) {
      return respuestaError("INVALID_INPUT", 422);
    }

    const telefonoNormalizado = typeof body.telefono === "string" ? normalizarTelefonoAR(body.telefono) : null;
    if (!telefonoNormalizado) {
      return respuestaError("INVALID_INPUT", 422);
    }

    const diaInicio = DateTime.fromISO(fecha, { zone: config.zonaHoraria }).startOf("day");
    if (!diaInicio.isValid) {
      return respuestaError("INVALID_INPUT", 422);
    }

    const [hora, minuto] = horaInicio.split(":").map(Number);
    if (Number.isNaN(hora) || Number.isNaN(minuto) || hora > 23 || minuto > 59) {
      return respuestaError("INVALID_INPUT", 422);
    }

    const inicio = diaInicio.set({ hour: hora, minute: minuto, second: 0, millisecond: 0 });
    const fin = inicio.plus({ minutes: config.duracionTurnoMinutos });
    const ahora = DateTime.now().setZone(config.zonaHoraria);

    // Fuera de horizonte: el día pedido está más allá de lo que se puede reservar hoy.
    const limiteHorizonte = ahora.startOf("day").plus({ weeks: config.horizonteReservaSemanas });
    if (diaInicio > limiteHorizonte) {
      return respuestaError("BEYOND_HORIZON", 422);
    }

    // Demasiado pronto (o ya pasó): el inicio del turno cae dentro de la anticipación mínima.
    if (inicio < ahora.plus({ hours: config.anticipacionMinimaReservaHoras })) {
      return respuestaError("TOO_SOON", 422);
    }

    // Debe caer completamente dentro de alguno de los cortes configurados para ese día de semana.
    const diaSemana = diaSemanaDesdeLuxonWeekday(diaInicio.weekday);
    const cortes = config.horarios[diaSemana];
    const dentroDeHorario = cortes.some((corte) => {
      const [horaCorteIni, minCorteIni] = corte.inicio.split(":").map(Number);
      const [horaCorteFin, minCorteFin] = corte.fin.split(":").map(Number);
      const corteInicio = diaInicio.set({ hour: horaCorteIni, minute: minCorteIni, second: 0, millisecond: 0 });
      const corteFin = diaInicio.set({ hour: horaCorteFin, minute: minCorteFin, second: 0, millisecond: 0 });
      return inicio >= corteInicio && fin <= corteFin;
    });
    if (!dentroDeHorario) {
      return respuestaError("OUTSIDE_HOURS", 422);
    }

    // Límite de reservas futuras activas por teléfono.
    const reservasActivas = await contarEventosFuturosPorTelefono(telefonoNormalizado, ahora);
    if (reservasActivas >= config.limiteReservasFuturasPorTelefono) {
      return respuestaError("PHONE_LIMIT", 429);
    }

    // Chequeo previo: evita pegarle a events.insert para un horario obviamente ocupado.
    // La garantía real contra dobles reservas no es este chequeo (que tiene una carrera
    // entre leer y escribir) sino el id determinístico por slot que usa `crearEvento`:
    // Calendar rechaza un id duplicado, así que si dos reservas llegan casi al mismo tiempo
    // para el mismo horario, el segundo `events.insert` falla y tiramos SlotOcupadoError.
    const eventosDelRango = await obtenerEventosOcupados(inicio, fin);
    const superpuestos = eventosQueSuperponenRango(eventosDelRango, inicio, fin);
    if (superpuestos.length > 0) {
      return respuestaError("SLOT_TAKEN", 409);
    }

    const token = generarTokenTurno();
    try {
      await crearEvento({
        nombre,
        telefonoNormalizado,
        mensaje: mensaje || undefined,
        inicio,
        fin,
        token,
      });
    } catch (error) {
      if (error instanceof SlotOcupadoError) {
        return respuestaError("SLOT_TAKEN", 409);
      }
      throw error;
    }

    const detalle: TurnoDetalle = {
      token,
      nombre,
      telefono: telefonoNormalizado,
      mensaje: mensaje || undefined,
      fecha,
      horaInicio,
      horaFin: fin.toFormat("HH:mm"),
      inicioISO: inicio.toISO() ?? "",
      finISO: fin.toISO() ?? "",
    };
    return NextResponse.json(detalle, { status: 201 });
  } catch (error) {
    console.error("Error al crear la reserva:", error instanceof Error ? error.message : "desconocido");
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
