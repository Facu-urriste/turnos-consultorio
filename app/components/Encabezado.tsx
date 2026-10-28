import { consultorioPublico } from "@/app/lib/consultorioPublico";

interface Props {
  subtitulo?: string;
}

export default function Encabezado({ subtitulo }: Props) {
  return (
    <header className="mb-6 text-center">
      <h1 className="text-2xl font-bold text-stone-900">{consultorioPublico.nombreConsultorio}</h1>
      {subtitulo && <p className="mt-1 text-base text-stone-500">{subtitulo}</p>}
    </header>
  );
}
