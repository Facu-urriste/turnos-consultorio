import type { CodigoErrorCancelacion, CodigoErrorReserva } from "./api";
import { consultorioPublico } from "./consultorioPublico";

export function mensajeErrorReserva(codigo: CodigoErrorReserva): string {
  switch (codigo) {
    case "SLOT_TAKEN":
      return "Uy, justo se ocupó ese horario. Elegí otro, por favor.";
    case "TOO_SOON":
      return "Ese horario está demasiado cerca. Elegí uno con un poco más de anticipación.";
    case "OUTSIDE_HOURS":
      return "Ese horario ya no está disponible. Elegí otro, por favor.";
    case "BEYOND_HORIZON":
      return "Esa fecha todavía no está disponible para reservar. Elegí una más cercana.";
    case "INVALID_INPUT":
      return "Revisá los datos ingresados, algo no es válido.";
    case "PHONE_LIMIT":
      return `Ya tenés el máximo de turnos reservados con este teléfono. Si necesitás otro, llamanos al ${consultorioPublico.telefono}.`;
    case "RATE_LIMITED":
      return `Hubo demasiados intentos. Esperá un momento o llamanos al ${consultorioPublico.telefono}.`;
    case "HONEYPOT":
    case "ERROR_DESCONOCIDO":
    default:
      return "No pudimos completar la reserva. Probá de nuevo en un momento.";
  }
}

export function mensajeErrorCancelacion(codigo: CodigoErrorCancelacion): string {
  switch (codigo) {
    case "DEMASIADO_TARDE":
      return `Ya no da tiempo para cancelar este turno por acá. Llamanos al ${consultorioPublico.telefono} y te ayudamos.`;
    case "YA_CANCELADO":
      return "Este turno ya estaba cancelado.";
    case "PASADO":
      return "Este turno ya pasó, no se puede cancelar.";
    case "NO_ENCONTRADO":
    case "ERROR_DESCONOCIDO":
    default:
      return `No pudimos cancelar el turno. Probá de nuevo o llamanos al ${consultorioPublico.telefono}.`;
  }
}
