import { describe, expect, it } from "vitest";
import { normalizarTelefonoAR } from "./telefono";

describe("normalizarTelefonoAR", () => {
  it("acepta formato internacional con 9", () => {
    expect(normalizarTelefonoAR("+54 9 11 1234-5678")).toBe("5491112345678");
  });

  it("acepta formato local con 15", () => {
    expect(normalizarTelefonoAR("011 15-1234-5678")).toBe("5491112345678");
  });

  it("acepta formato local sin 15 ni 0", () => {
    expect(normalizarTelefonoAR("11 1234-5678")).toBe("5491112345678");
  });

  it("acepta formato internacional sin 9", () => {
    expect(normalizarTelefonoAR("+54 11 1234-5678")).toBe("5491112345678");
  });

  it("rechaza algo que no es un teléfono", () => {
    expect(normalizarTelefonoAR("hola")).toBeNull();
    expect(normalizarTelefonoAR("123")).toBeNull();
  });
});
