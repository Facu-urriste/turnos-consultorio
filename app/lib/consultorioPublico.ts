import consultorio from "@/config/consultorio.json";
import { normalizarTelefonoAR } from "@/lib/telefono";

const telefonoNormalizado = normalizarTelefonoAR(consultorio.consultorio.telefono);

/**
 * Datos públicos del consultorio para el cliente, leídos directamente de
 * `config/consultorio.json` (sin duplicarlos a mano). Es un import seguro para el
 * navegador: ese JSON no tiene secretos, a diferencia de `config/config.ts` (que además
 * exporta `secrets` leyendo variables de entorno del servidor y por eso nunca debe
 * importarse desde código de cliente).
 */
export const consultorioPublico = {
  nombreProfesional: consultorio.profesional.nombre,
  nombreConsultorio: consultorio.consultorio.nombre,
  direccion: consultorio.consultorio.direccion,
  telefono: consultorio.consultorio.telefono,
  /** Número normalizado sin "+", para armar links `tel:`. */
  telefonoHref: telefonoNormalizado ? `+${telefonoNormalizado}` : consultorio.consultorio.telefono,
};
