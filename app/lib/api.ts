import type {
  CancelacionErrorCodigo,
  DisponibilidadDia,
  DisponibilidadMes,
  ReservaErrorCodigo,
  ReservaInput,
  TurnoConsulta,
  TurnoDetalle,
} from "@/lib/types";

async function leerJsonSeguro(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function obtenerDisponibilidadMes(mes: string): Promise<DisponibilidadMes> {
  const res = await fetch(`/api/disponibilidad?mes=${encodeURIComponent(mes)}`);
  if (!res.ok) throw new Error("No se pudo cargar la disponibilidad del mes");
  return (await res.json()) as DisponibilidadMes;
}

export async function obtenerDisponibilidadDia(fecha: string): Promise<DisponibilidadDia> {
  const res = await fetch(`/api/disponibilidad?fecha=${encodeURIComponent(fecha)}`);
  if (!res.ok) throw new Error("No se pudo cargar los horarios del día");
  return (await res.json()) as DisponibilidadDia;
}

export type CodigoErrorReserva = ReservaErrorCodigo | "ERROR_DESCONOCIDO";

export type ResultadoReserva =
  | { ok: true; turno: TurnoDetalle }
  | { ok: false; error: CodigoErrorReserva };

export async function crearReserva(input: ReservaInput): Promise<ResultadoReserva> {
  let res: Response;
  try {
    res = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: "ERROR_DESCONOCIDO" };
  }

  const datos = await leerJsonSeguro(res);
  if (res.ok) {
    return { ok: true, turno: datos as TurnoDetalle };
  }
  const codigo = (datos as { error?: ReservaErrorCodigo } | null)?.error;
  return { ok: false, error: codigo ?? "ERROR_DESCONOCIDO" };
}

export async function obtenerTurno(token: string): Promise<TurnoConsulta> {
  const res = await fetch(`/api/turno/${encodeURIComponent(token)}`);
  if (!res.ok) {
    return { estado: "no-encontrado" };
  }
  return (await res.json()) as TurnoConsulta;
}

export type CodigoErrorCancelacion = CancelacionErrorCodigo | "ERROR_DESCONOCIDO";

export type ResultadoCancelacion = { ok: true } | { ok: false; error: CodigoErrorCancelacion };

export async function cancelarTurno(token: string): Promise<ResultadoCancelacion> {
  let res: Response;
  try {
    res = await fetch(`/api/turno/${encodeURIComponent(token)}/cancelar`, { method: "POST" });
  } catch {
    return { ok: false, error: "ERROR_DESCONOCIDO" };
  }
  if (res.ok) return { ok: true };
  const datos = await leerJsonSeguro(res);
  const codigo = (datos as { error?: CancelacionErrorCodigo } | null)?.error;
  return { ok: false, error: codigo ?? "ERROR_DESCONOCIDO" };
}
