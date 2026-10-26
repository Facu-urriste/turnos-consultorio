import type { Metadata } from "next";
import Link from "next/link";
import { consultorioPublico } from "@/app/lib/consultorioPublico";
import Encabezado from "@/app/components/Encabezado";

export const metadata: Metadata = {
  title: "Política de privacidad",
};

export default function PrivacidadPage() {
  return (
    <>
      <Encabezado subtitulo="Política de privacidad" />
      <main className="flex-1">
        <div className="space-y-4 text-base leading-relaxed text-zinc-700">
          <p>
            Para reservar un turno te pedimos tu nombre, tu teléfono y, si querés, un mensaje
            breve contándole el motivo de la consulta a {consultorioPublico.nombreProfesional}.
          </p>
          <p>
            Esos datos los usamos únicamente para organizar tu turno y, si hace falta, para
            contactarte por ese tema. Los ve solo {consultorioPublico.nombreProfesional}.
          </p>
          <p>
            No tenemos una base de datos propia: tu turno se guarda únicamente en el calendario de
            Google de {consultorioPublico.nombreProfesional}, de la misma forma en que se guardaría
            cualquier otro turno de su agenda.
          </p>
          <p>
            No compartimos tu información con terceros, no la usamos para publicidad y esta página
            no tiene seguimiento ni analytics de terceros.
          </p>
          <p>
            Si en algún momento tenés dudas sobre tus datos o querés que los eliminemos, podés
            llamarnos al{" "}
            <a href={`tel:${consultorioPublico.telefonoHref}`} className="font-semibold underline">
              {consultorioPublico.telefono}
            </a>
            .
          </p>
        </div>

        <Link href="/" className="mt-8 block text-center text-base font-semibold text-teal-700 underline">
          Volver al inicio
        </Link>
      </main>
    </>
  );
}
