import { consultorioPublico } from "@/app/lib/consultorioPublico";

interface Props {
  subtitulo?: string;
}

export default function Encabezado({ subtitulo }: Props) {
  return (
    <header className="mb-6 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">{consultorioPublico.nombreConsultorio}</h1>
      {subtitulo && <p className="mt-1 text-base text-zinc-500">{subtitulo}</p>}
    </header>
  );
}
