"use client";

import { useState, useSyncExternalStore } from "react";
import { claseBotonSecundario } from "./ui";

interface Props {
  url: string;
  texto: string;
}

// La disponibilidad de Web Share API no cambia en la vida de la página, así que no hace
// falta suscribirse a nada: esta función de "sin suscripción" cumple el contrato de
// useSyncExternalStore sin crear una suscripción real.
function sinSuscripcion() {
  return () => {};
}

function leerSoporteWebShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function leerSoporteWebShareServidor() {
  return false;
}

export default function BotonesCompartir({ url, texto }: Props) {
  const [copiado, setCopiado] = useState(false);

  // useSyncExternalStore devuelve el mismo valor en el render del servidor y en el primer
  // render del cliente (la versión "servidor" da `false`), y recién después de montar lee el
  // valor real del navegador. Evita tanto el desajuste de hidratación como la necesidad de un
  // efecto que haga setState (ver react-hooks/set-state-in-effect).
  const hayWebShare = useSyncExternalStore(sinSuscripcion, leerSoporteWebShare, leerSoporteWebShareServidor);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si falla el portapapeles, la persona puede copiar el link manualmente.
    }
  }

  async function compartir() {
    try {
      await navigator.share({ title: texto, url });
    } catch {
      // La persona canceló el diálogo de compartir, no hacemos nada.
    }
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button type="button" onClick={copiar} className={claseBotonSecundario}>
        {copiado ? "¡Copiado!" : "Copiar link"}
      </button>
      {hayWebShare && (
        <button type="button" onClick={compartir} className={claseBotonSecundario}>
          Compartir
        </button>
      )}
    </div>
  );
}
