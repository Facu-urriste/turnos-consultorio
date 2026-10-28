"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { crearReserva } from "@/app/lib/api";
import { mensajeErrorReserva } from "@/app/lib/mensajes";
import { formatFechaLarga } from "@/app/lib/fecha";
import { consultorioPublico } from "@/app/lib/consultorioPublico";
import type { TurnoDetalle } from "@/lib/types";
import { claseBotonPrimario } from "./ui";

const MAX_MENSAJE = 200;

// Técnica de honeypot "visualmente oculto": el campo sigue en el DOM y es enfocable por
// teclado si alguien tabula sin querer, pero no se ve ni se detecta con heurísticas simples
// de tipo display:none. Las personas nunca lo completan; los bots que autocompletan
// formularios sí, y eso nos sirve para descartar el envío del lado del servidor.
const estiloHoneypot: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
};

interface Props {
  fecha: string;
  hora: string;
  onReservado: (turno: TurnoDetalle) => void;
  onSlotTomado: () => void;
  onVolver: () => void;
}

export default function FormularioReserva({ fecha, hora, onReservado, onSlotTomado, onVolver }: Props) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorTelefono, setErrorTelefono] = useState<string | null>(null);

  function validar(): boolean {
    let ok = true;
    setErrorNombre(null);
    setErrorTelefono(null);

    if (nombre.trim().length < 2) {
      setErrorNombre("Ingresá tu nombre.");
      ok = false;
    }

    const soloDigitos = telefono.replace(/\D/g, "");
    if (soloDigitos.length < 8) {
      setErrorTelefono("Ingresá un teléfono válido.");
      ok = false;
    }

    return ok;
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    if (!validar()) return;

    setEnviando(true);
    const resultado = await crearReserva({
      fecha,
      horaInicio: hora,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      mensaje: mensaje.trim() ? mensaje.trim() : undefined,
      honeypot,
    });
    setEnviando(false);

    if (resultado.ok) {
      onReservado(resultado.turno);
      return;
    }

    if (resultado.error === "SLOT_TAKEN") {
      onSlotTomado();
      return;
    }

    setErrorGeneral(mensajeErrorReserva(resultado.error));
  }

  return (
    <div>
      <button type="button" onClick={onVolver} className="mb-4 text-base font-semibold text-primary-700">
        ‹ Volver a los horarios
      </button>
      <h2 className="mb-1 text-xl font-semibold capitalize text-stone-900">{formatFechaLarga(fecha)}</h2>
      <p className="mb-6 text-lg text-stone-700">Turno a las {hora} hs</p>

      <form onSubmit={manejarEnvio} className="space-y-5" noValidate>
        <div>
          <label htmlFor="nombre" className="mb-1 block text-base font-medium text-stone-800">
            Nombre y apellido
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-lg text-stone-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          {errorNombre && <p className="mt-1 text-sm text-red-600">{errorNombre}</p>}
        </div>

        <div>
          <label htmlFor="telefono" className="mb-1 block text-base font-medium text-stone-800">
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ej: 11 1234-5678"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-lg text-stone-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <p className="mt-1 text-sm text-stone-500">Podés escribirlo con o sin 0, 15 o +54.</p>
          {errorTelefono && <p className="mt-1 text-sm text-red-600">{errorTelefono}</p>}
        </div>

        <div>
          <label htmlFor="mensaje" className="mb-1 block text-base font-medium text-stone-800">
            Mensaje para el profesional (opcional)
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={3}
            maxLength={MAX_MENSAJE}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Opcional: contale brevemente el motivo"
            className="w-full resize-none rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <p className="mt-1 text-right text-sm text-stone-400">
            {mensaje.length}/{MAX_MENSAJE}
          </p>
        </div>

        <div style={estiloHoneypot} aria-hidden="true">
          <label htmlFor="sitio-web">No completar este campo</label>
          <input
            id="sitio-web"
            name="sitio-web"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {errorGeneral && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
            {errorGeneral}
          </p>
        )}

        <button type="submit" disabled={enviando} className={claseBotonPrimario}>
          {enviando ? "Confirmando..." : "Confirmar turno"}
        </button>

        <p className="text-center text-sm text-stone-500">
          Tus datos los ve solo {consultorioPublico.nombreProfesional} para organizar tu turno.{" "}
          <Link href="/privacidad" className="underline">
            Más información
          </Link>
        </p>
      </form>
    </div>
  );
}
