import { formatFechaHoraDesdeISO } from "@/app/lib/fecha";
import { consultorioPublico } from "@/app/lib/consultorioPublico";

interface Props {
  inicioISO: string;
}

export default function DetalleTurno({ inicioISO }: Props) {
  return (
    <div className="rounded-2xl bg-teal-50 p-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Tu turno</p>
      <p className="mt-1 text-xl font-semibold capitalize text-zinc-900">
        {formatFechaHoraDesdeISO(inicioISO)}
      </p>
      <p className="mt-3 text-base text-zinc-700">{consultorioPublico.nombreConsultorio}</p>
      <p className="text-base text-zinc-700">{consultorioPublico.direccion}</p>
    </div>
  );
}
