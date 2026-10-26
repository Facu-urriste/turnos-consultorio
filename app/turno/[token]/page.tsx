"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { obtenerTurno } from "@/app/lib/api";
import { formatDescripcionCorta } from "@/app/lib/fecha";
import { consultorioPublico } from "@/app/lib/consultorioPublico";
import type { TurnoConsulta } from "@/lib/types";
import Encabezado from "@/app/components/Encabezado";
import DetalleTurno from "@/app/components/DetalleTurno";
import BotonesAgregarCalendario from "@/app/components/BotonesAgregarCalendario";
import SeccionCancelarTurno from "@/app/components/SeccionCancelarTurno";
import { claseBotonPrimario } from "@/app/components/ui";

interface ResultadoConsulta {
  token: string;
  consulta: TurnoConsulta | null;
  error: boolean;
}

export default function TurnoPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token ?? "";

  // El resultado se guarda junto con el token al que corresponde, y "cargando"/"error"/
  // "consulta" se derivan comparando contra `token`. Así evitamos hacer setState de forma
  // síncrona dentro del efecto (ver react-hooks/set-state-in-effect): solo seteamos estado
  // dentro de los callbacks de la promesa, nunca en el cuerpo del efecto en sí.
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [canceladoAhora, setCanceladoAhora] = useState(false);

  useEffect(() => {
    if (!token) return;
    let activo = true;
    obtenerTurno(token)
      .then((c) => {
        if (activo) setResultado({ token, consulta: c, error: false });
      })
      .catch(() => {
        if (activo) setResultado({ token, consulta: null, error: true });
      });
    return () => {
      activo = false;
    };
  }, [token]);

  const vigente = resultado && resultado.token === token ? resultado : null;
  const cargando = !!token && vigente === null;
  const error = !token || (vigente?.error ?? false);
  const consulta = vigente?.consulta ?? null;

  const contenido = calcularContenido();

  return (
    <>
      <Encabezado subtitulo="Tu turno" />
      <main className="flex-1">{contenido}</main>
    </>
  );

  function calcularContenido() {
    if (cargando) {
      return <p className="py-16 text-center text-lg text-zinc-600">Buscando tu turno...</p>;
    }

    if (error || !consulta) {
      return (
        <MensajeConBoton texto="No pudimos cargar tu turno. Probá de nuevo en un momento." />
      );
    }

    if (canceladoAhora || consulta.estado === "cancelado") {
      return <MensajeConBoton texto="Este turno fue cancelado." textoBoton="Sacar un nuevo turno" />;
    }

    if (consulta.estado === "pasado") {
      return <MensajeConBoton texto="Este turno ya pasó." textoBoton="Sacar un nuevo turno" />;
    }

    if (consulta.estado === "no-encontrado" || !consulta.turno) {
      return (
        <MensajeConBoton
          texto="No encontramos este turno. Puede que el link esté incompleto o ya no sea válido."
          textoBoton="Sacar un turno"
        />
      );
    }

    const turno = consulta.turno;
    return (
      <div className="flex flex-col gap-6">
        <DetalleTurno inicioISO={turno.inicioISO} />
        <BotonesAgregarCalendario token={token} inicioISO={turno.inicioISO} finISO={turno.finISO} />
        <SeccionCancelarTurno
          token={token}
          descripcionTurno={formatDescripcionCorta(turno.inicioISO)}
          puedeCancelar={consulta.puedeCancelar ?? false}
          onCancelado={() => setCanceladoAhora(true)}
        />
      </div>
    );
  }
}

function MensajeConBoton({ texto, textoBoton = "Sacar un turno" }: { texto: string; textoBoton?: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <p className="text-lg text-zinc-700">{texto}</p>
      <Link href="/" className={claseBotonPrimario}>
        {textoBoton}
      </Link>
      <p className="text-sm text-zinc-500">
        O llamanos al{" "}
        <a href={`tel:${consultorioPublico.telefonoHref}`} className="font-semibold underline">
          {consultorioPublico.telefono}
        </a>
      </p>
    </div>
  );
}
