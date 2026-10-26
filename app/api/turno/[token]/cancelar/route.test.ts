import { beforeEach, describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import { config } from "@/config/config";

/**
 * Mock de lib/calendar/cliente.ts. `buscarEventoPorToken` y `eliminarEvento` son vi.fn()
 * configurables por test; `esErrorRecursoInexistente` reproduce la regla real (404/410).
 */
const { RecursoInexistenteErrorFake, buscarEventoPorTokenMock, eliminarEventoMock } = vi.hoisted(() => {
  class RecursoInexistenteErrorFake extends Error {
    code: number;
    constructor(code: number) {
      super("El recurso ya no existe");
      this.code = code;
    }
  }
  const buscarEventoPorTokenMock = vi.fn();
  const eliminarEventoMock = vi.fn();
  return { RecursoInexistenteErrorFake, buscarEventoPorTokenMock, eliminarEventoMock };
});

vi.mock("@/lib/calendar/cliente", () => ({
  buscarEventoPorToken: buscarEventoPorTokenMock,
  eliminarEvento: eliminarEventoMock,
  esErrorRecursoInexistente: (err: unknown) => {
    const code = (err as { code?: number } | null)?.code;
    return code === 404 || code === 410;
  },
}));

const { POST } = await import("./route");

function contexto(token: string) {
  return { params: Promise.resolve({ token }) };
}

function evento(opts: { inicioEnHoras: number; finEnHoras?: number }) {
  const ahora = DateTime.now().setZone(config.zonaHoraria);
  const inicio = ahora.plus({ hours: opts.inicioEnHoras });
  const fin = opts.finEnHoras !== undefined ? ahora.plus({ hours: opts.finEnHoras }) : inicio.plus({ minutes: config.duracionTurnoMinutos });
  return {
    id: "evento-id-123",
    nombre: "Paciente Test",
    telefonoNormalizado: "5491112345678",
    inicio,
    fin,
  };
}

describe("POST /api/turno/[token]/cancelar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("link válido fuera de la ventana mínima: cancela y libera el horario", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: 48 })); // bien lejos
    eliminarEventoMock.mockResolvedValue(undefined);

    const res = await POST(new Request("http://localhost"), contexto("token-valido"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ estado: "cancelado" });
    expect(eliminarEventoMock).toHaveBeenCalledWith("evento-id-123");
  });

  it("token inexistente devuelve NO_ENCONTRADO", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost"), contexto("token-no-existe"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NO_ENCONTRADO" });
    expect(eliminarEventoMock).not.toHaveBeenCalled();
  });

  it("turno ya cancelado: buscarEventoPorToken lo filtra y el endpoint devuelve NO_ENCONTRADO (no YA_CANCELADO)", async () => {
    // IMPORTANTE (hallazgo, ver reporte): buscarEventoPorToken en lib/calendar/cliente.ts
    // descarta los eventos con status "cancelled" (`.find((e) => e.status !== "cancelled")`),
    // así que para este endpoint un turno ya cancelado es indistinguible de uno inexistente:
    // siempre devuelve NO_ENCONTRADO, nunca el código YA_CANCELADO que existe en el tipo
    // CancelacionErrorCodigo y tiene su propio mensaje en app/lib/mensajes.ts. Este test fija
    // el comportamiento real para que no se rompa sin darse cuenta.
    buscarEventoPorTokenMock.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost"), contexto("token-ya-cancelado"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NO_ENCONTRADO" });
  });

  it("turno pasado devuelve PASADO", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: -3, finEnHoras: -2.5 }));

    const res = await POST(new Request("http://localhost"), contexto("token-pasado"));

    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: "PASADO" });
    expect(eliminarEventoMock).not.toHaveBeenCalled();
  });

  it("turno borrado a mano por el profesional (ya no existe en Calendar al cancelar) devuelve NO_ENCONTRADO", async () => {
    // buscarEventoPorToken todavía lo encuentra (consulta previa), pero entre esa lectura y el
    // eliminarEvento el profesional lo borró a mano: Calendar devuelve 404/410 al intentar
    // eliminarlo, y el endpoint debe tratarlo como "no encontrado" en vez de romper con 500.
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: 48 }));
    eliminarEventoMock.mockRejectedValue(new RecursoInexistenteErrorFake(404));

    const res = await POST(new Request("http://localhost"), contexto("token-borrado-a-mano"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NO_ENCONTRADO" });
  });

  it("cancelación dentro de la ventana mínima de horas se rechaza con DEMASIADO_TARDE", async () => {
    // anticipacionMinimaCancelacionHoras = 2 en la config de test; el turno empieza en 1 hora.
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: 1 }));

    const res = await POST(new Request("http://localhost"), contexto("token-tarde"));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "DEMASIADO_TARDE" });
    expect(eliminarEventoMock).not.toHaveBeenCalled();
    // La UI (app/lib/mensajes.ts -> mensajeErrorCancelacion) resuelve este código mostrando el
    // teléfono del consultorio como alternativa; el endpoint en sí no lo incluye en el body.
  });

  it("cancelación justo fuera de la ventana mínima se permite", async () => {
    // Un minuto más allá del límite de anticipacionMinimaCancelacionHoras: el código usa
    // `evento.inicio < limite`, así que esto debe quedar del lado permitido. (No se prueba el
    // límite exacto en milisegundos porque el test y la ruta llaman a DateTime.now() por
    // separado, lo que lo haría flaky sin aportar nada.)
    buscarEventoPorTokenMock.mockResolvedValue(
      evento({ inicioEnHoras: config.anticipacionMinimaCancelacionHoras + 1 / 60 })
    );
    eliminarEventoMock.mockResolvedValue(undefined);

    const res = await POST(new Request("http://localhost"), contexto("token-justo-fuera-de-ventana"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ estado: "cancelado" });
  });

  it("si eliminarEvento falla con un error que no es de recurso inexistente, devuelve INTERNAL_ERROR (500)", async () => {
    buscarEventoPorTokenMock.mockResolvedValue(evento({ inicioEnHoras: 48 }));
    eliminarEventoMock.mockRejectedValue(new Error("fallo de red inesperado"));

    const res = await POST(new Request("http://localhost"), contexto("token-error-raro"));

    expect(res.status).toBe(500);
  });
});
