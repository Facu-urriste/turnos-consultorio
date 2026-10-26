import { formatFechaGoogleCalendar } from "@/app/lib/fecha";
import { consultorioPublico } from "@/app/lib/consultorioPublico";
import { claseBotonSecundario } from "./ui";

interface Props {
  token: string;
  inicioISO: string;
  finISO: string;
}

export default function BotonesAgregarCalendario({ token, inicioISO, finISO }: Props) {
  const texto = encodeURIComponent(`Turno - ${consultorioPublico.nombreConsultorio}`);
  const detalles = encodeURIComponent(`Turno con ${consultorioPublico.nombreProfesional}.`);
  const ubicacion = encodeURIComponent(consultorioPublico.direccion);
  const fechas = `${formatFechaGoogleCalendar(inicioISO)}/${formatFechaGoogleCalendar(finISO)}`;
  const urlGoogle = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${texto}&dates=${fechas}&location=${ubicacion}&details=${detalles}`;
  const urlIcs = `/api/turno/${encodeURIComponent(token)}/ics`;

  return (
    <div>
      <p className="mb-2 text-base font-medium text-zinc-700">Agregalo a tu calendario</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a href={urlIcs} className={claseBotonSecundario}>
          Agregar a mi calendario
        </a>
        <a href={urlGoogle} target="_blank" rel="noopener noreferrer" className={claseBotonSecundario}>
          Google Calendar
        </a>
      </div>
    </div>
  );
}
