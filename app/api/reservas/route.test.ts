import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DateTime } from "luxon";
import { config } from "@/config/config";

/**
 * Mock de lib/calendar/cliente.ts que simula lo mínimo necesario para probar de verdad la
 * protección contra dobles reservas: un "almacén" en memoria indexado por un id determinístico
 * (misma idea que idEventoParaSlot en el módulo real), donde el segundo "insert" para el mismo
 * horario revienta con SlotOcupadoError. El único punto async es la simulación de latencia de
 * red *antes* de la sección crítica; la verificación+escritura en sí es sincrónica (igual que en
 * el servidor real de Calendar, que resuelve el conflicto de forma atómica), así que dos llamadas
 * disparadas con Promise.all compiten de verdad por el mismo id.
 */
const { almacenEventos, contadorPorTelefono, SlotOcupadoErrorFake, crearEventoMock } = vi.hoisted(() => {
  class SlotOcupadoErrorFake extends Error {
    constructor() {
      super("El horario ya estaba ocupado");
    }
  }

  const almacenEventos = new Map<string, { status: "confirmed" | "cancelled" }>();
  const contadorPorTelefono = new Map<string, number>();

  async function crearEventoMock(datos: { inicio: { toISO: () => string | null } }): Promise<string> {
    const id = `turno-${datos.inicio.toISO()}`;
    await new Promise((resolve) => setTimeout(resolve, 5)); // latencia de red simulada
    const existente = almacenEventos.get(id);
    if (existente && existente.status !== "cancelled") {
      throw new SlotOcupadoErrorFake();
    }
    almacenEventos.set(id, { status: "confirmed" });
    return id;
  }

  return { almacenEventos, contadorPorTelefono, SlotOcupadoErrorFake, crearEventoMock };
});

vi.mock("@/lib/calendar/cliente", () => ({
  SlotOcupadoError: SlotOcupadoErrorFake,
  obtenerEventosOcupados: vi.fn(async () => []),
  contarEventosFuturosPorTelefono: vi.fn(async (telefono: string) => contadorPorTelefono.get(telefono) ?? 0),
  crearEvento: vi.fn(crearEventoMock),
}));

const { POST } = await import("./route");

function proximoDiaHabil(diasDesdeHoy: number): DateTime {
  let fecha = DateTime.now().setZone(config.zonaHoraria).startOf("day").plus({ days: diasDesdeHoy });
  while (fecha.weekday === 6 || fecha.weekday === 7) {
    fecha = fecha.plus({ days: 1 });
  }
  return fecha;
}

function requestReserva(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/reservas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reservas - reserva concurrente", () => {
  beforeEach(() => {
    almacenEventos.clear();
    contadorPorTelefono.clear();
  });

  it("exactamente una de dos reservas simultáneas al mismo horario gana; la otra recibe SLOT_TAKEN", async () => {
    const dia = proximoDiaHabil(7); // bien adentro del horizonte y de la anticipación mínima
    const fecha = dia.toFormat("yyyy-MM-dd");

    const bodyA = {
      fecha,
      horaInicio: "10:00",
      nombre: "Paciente Uno",
      telefono: "11 1111-1111",
      honeypot: "",
    };
    const bodyB = {
      fecha,
      horaInicio: "10:00",
      nombre: "Paciente Dos",
      telefono: "11 2222-2222", // distinto teléfono: no queremos chocar con PHONE_LIMIT
      honeypot: "",
    };

    const [resA, resB] = await Promise.all([
      POST(requestReserva(bodyA)),
      POST(requestReserva(bodyB)),
    ]);

    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()]);
    const resultados = [
      { status: resA.status, json: jsonA },
      { status: resB.status, json: jsonB },
    ];

    const exitosas = resultados.filter((r) => r.status === 201);
    const rechazadas = resultados.filter((r) => r.status === 409);

    expect(exitosas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect(rechazadas[0].json).toEqual({ error: "SLOT_TAKEN" });
    expect(almacenEventos.size).toBe(1);
  });
});

describe("POST /api/reservas - casos base", () => {
  beforeEach(() => {
    almacenEventos.clear();
    contadorPorTelefono.clear();
  });

  it("crea la reserva cuando el horario está libre", async () => {
    const dia = proximoDiaHabil(7);
    const res = await POST(
      requestReserva({
        fecha: dia.toFormat("yyyy-MM-dd"),
        horaInicio: "10:00",
        nombre: "Paciente Test",
        telefono: "11 3333-3333",
        honeypot: "",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.horaInicio).toBe("10:00");
    expect(body.token).toBeTruthy();
  });

  it("rechaza un horario fuera de los cortes configurados (OUTSIDE_HOURS)", async () => {
    const dia = proximoDiaHabil(7);
    const res = await POST(
      requestReserva({
        fecha: dia.toFormat("yyyy-MM-dd"),
        horaInicio: "14:00", // entre el corte de la mañana y el de la tarde
        nombre: "Paciente Test",
        telefono: "11 4444-4444",
        honeypot: "",
      })
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "OUTSIDE_HOURS" });
  });

  it("rechaza una fecha más allá del horizonte de reserva (BEYOND_HORIZON)", async () => {
    const dia = proximoDiaHabil(7 * 10); // 10 semanas, por encima de las 4 configuradas
    const res = await POST(
      requestReserva({
        fecha: dia.toFormat("yyyy-MM-dd"),
        horaInicio: "10:00",
        nombre: "Paciente Test",
        telefono: "11 5555-5555",
        honeypot: "",
      })
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "BEYOND_HORIZON" });
  });

  it("rechaza cuando el teléfono ya alcanzó el límite de reservas futuras", async () => {
    const telefonoNormalizado = "5491166666666";
    contadorPorTelefono.set(telefonoNormalizado, config.limiteReservasFuturasPorTelefono);
    const dia = proximoDiaHabil(7);
    const res = await POST(
      requestReserva({
        fecha: dia.toFormat("yyyy-MM-dd"),
        horaInicio: "10:00",
        nombre: "Paciente Test",
        telefono: "11 6666-6666",
        honeypot: "",
      })
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "PHONE_LIMIT" });
  });

  it("rechaza silenciosamente (como INVALID_INPUT) cuando el honeypot viene lleno", async () => {
    const dia = proximoDiaHabil(7);
    const res = await POST(
      requestReserva({
        fecha: dia.toFormat("yyyy-MM-dd"),
        horaInicio: "10:00",
        nombre: "Bot",
        telefono: "11 7777-7777",
        honeypot: "http://spam.example",
      })
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "HONEYPOT" });
  });
});
