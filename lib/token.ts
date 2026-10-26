import { randomBytes } from "crypto";

/** Token de 22 caracteres, URL-safe, sin relación con los datos del paciente. */
export function generarTokenTurno(): string {
  return randomBytes(16).toString("base64url");
}
