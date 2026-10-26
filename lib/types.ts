export type EstadoDia =
  | "disponible"
  | "completo"
  | "cerrado"
  | "pasado"
  | "fuera-de-horizonte";

export interface DisponibilidadMes {
  mes: string; // "YYYY-MM"
  dias: Record<string, EstadoDia>; // "YYYY-MM-DD" -> estado
}

export interface DisponibilidadDia {
  fecha: string; // "YYYY-MM-DD"
  horarios: string[]; // ["09:00", "09:30", ...] en hora local del consultorio
}

export interface ReservaInput {
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  nombre: string;
  telefono: string;
  mensaje?: string;
  honeypot?: string; // debe llegar vacío
}

export type ReservaErrorCodigo =
  | "SLOT_TAKEN"
  | "OUTSIDE_HOURS"
  | "TOO_SOON"
  | "BEYOND_HORIZON"
  | "PHONE_LIMIT"
  | "RATE_LIMITED"
  | "INVALID_INPUT"
  | "HONEYPOT";

export interface ReservaErrorBody {
  error: ReservaErrorCodigo;
}

export interface TurnoDetalle {
  token: string;
  nombre: string;
  telefono: string;
  mensaje?: string;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
  inicioISO: string; // con offset de zona horaria
  finISO: string;
}

export type EstadoTurno = "activo" | "cancelado" | "pasado" | "no-encontrado";

export interface TurnoConsulta {
  estado: EstadoTurno;
  turno?: Omit<TurnoDetalle, "token" | "telefono">;
  puedeCancelar?: boolean;
}

export type CancelacionErrorCodigo = "DEMASIADO_TARDE" | "NO_ENCONTRADO" | "YA_CANCELADO" | "PASADO";

export interface CancelacionErrorBody {
  error: CancelacionErrorCodigo;
}
