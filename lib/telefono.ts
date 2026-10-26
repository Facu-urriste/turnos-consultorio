const LONGITUDES_CODIGO_AREA = [4, 3, 2] as const; // se prueban de mayor a menor para evitar falsos positivos

/**
 * Normaliza un teléfono argentino a formato internacional de WhatsApp (549 + área + número),
 * aceptando variantes con/sin 0, 15 o +54. No existe una tabla completa de códigos de área:
 * se infiere probando longitudes típicas (2/3/4 dígitos), lo cual cubre el caso dominante
 * (CABA/GBA, código "11") y la mayoría de los demás.
 */
export function normalizarTelefonoAR(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length < 8 || digits.length > 12) return null;

  for (const areaLen of LONGITUDES_CODIGO_AREA) {
    if (digits.length <= areaLen) continue;
    const area = digits.slice(0, areaLen);
    const resto = digits.slice(areaLen);
    if (resto.startsWith("15") && resto.length - 2 >= 6 && resto.length - 2 <= 8) {
      return `549${area}${resto.slice(2)}`;
    }
  }

  if (digits.length >= 9 && digits.length <= 11) {
    return `549${digits}`;
  }

  return null;
}

export function esTelefonoARValido(input: string): boolean {
  return normalizarTelefonoAR(input) !== null;
}

export function telefonoWhatsAppUrl(telefonoNormalizado: string): string {
  return `https://wa.me/${telefonoNormalizado}`;
}

export function telefonoTelUrl(telefonoNormalizado: string): string {
  return `tel:+${telefonoNormalizado}`;
}
