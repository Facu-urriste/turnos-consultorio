import { beforeEach, describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import { config } from "@/config/config";

const { buscarEventoPorTokenMock } = vi.hoisted(() => ({
  buscarEventoPorTokenMock: vi.fn(),
}));

vi.mock("@/lib/calendar/cliente", () => ({
  buscarEventoPorToken: buscarEventoPorTokenMock,
}));

const { GET } = await import("./route");

function contexto(token: string) {
  return { params: Promise.resolve({ token }) };
}

function evento(opts: { inicioEnHoras: number; finEnHoras?: number }) {
  const ahora = DateTime.now().setZone(config.zonaHoraria);
  const inicio = ahora.plus({ hours: opts.inicioEnHoras });
  const fin =
    opts.finEnHoras !== undefined
      ? ahora.plus({ hours: opts.finEnHoras })
      : inicio.plus({ minutes: config.duracionTurnoMinutos });
  return {
    id: "evento-id-123",
    nombre: "Paciente Test",
    telefonoNormalizado: "5491112345678",
    inicio,
    fin,
  };
}

describe("GET /api/turno/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("token inexistente devuelve estado no-encontrado", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), contexto("no-existe"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ estado: "no-encontrado" });
  });

  it("turno ya cancelado también devuelve no-encontrado (nunca 'cancelado') al recargar la página", async () => {
    // HALLAZGO (ver reporte): como buscarEventoPorToken descarta los eventos cancelados,
    // revisitar el link de un turno cancelado (en otra pestaña, otro día, o tras cerrar y
    // volver a abrir el navegador) muestra "No encontramos este turno..." en vez de "Este
    // turno fue cancelado.". El estado "cancelado" en la UI solo se alcanza en el mismo
    // request en que el usuario acaba de cancelar (ver app/turno/[token]/page.tsx,
    // `canceladoAhora`), nunca por una consulta posterior a este endpoint.
    buscarEventoPorTokenMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), contexto("ya-cancelado"));
    expect(await res.json()).toEqual({ estado: "no-encontrado" });
  });

  it("turno pasado devuelve estado pasado con el detalle", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: -3, finEnHoras: -2.5 }));
    const res = await GET(new Request("http://localhost"), contexto("pasado"));
    const body = await res.json();
    expect(body.estado).toBe("pasado");
    expect(body.turno.nombre).toBe("Paciente Test");
  });

  it("turno activo con suficiente anticipación permite cancelar", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: 48 }));
    const res = await GET(new Request("http://localhost"), contexto("activo"));
    const body = await res.json();
    expect(body.estado).toBe("activo");
    expect(body.puedeCancelar).toBe(true);
  });

  it("turno activo dentro de la ventana mínima de cancelación no permite cancelar", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: 1 }));
    const res = await GET(new Request("http://localhost"), contexto("activo-tarde"));
    const body = await res.json();
    expect(body.estado).toBe("activo");
    expect(body.puedeCancelar).toBe(false);
  });

  it("el teléfono nunca se expone en la respuesta (TurnoConsulta omite token y telefono)", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: 48 }));
    const res = await GET(new Request("http://localhost"), contexto("activo"));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("5491112345678");
    expect(body.turno.telefono).toBeUndefined();
    expect(body.turno.token).toBeUndefined();
  });

  it("si buscarEventoPorToken falla, devuelve 200 con no-encontrado en vez de 500", async () => {
    buscarEventoPorTokenMock.mockRejectedValue(new Error("fallo de red"));
    const res = await GET(new Request("http://localhost"), contexto("cualquiera"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ estado: "no-encontrado" });
  });
});
