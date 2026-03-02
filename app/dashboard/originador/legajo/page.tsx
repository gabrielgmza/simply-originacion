import BuscadorScoringReal from "./buscador-real";
import FormularioAprobacion from "./formulario-aprobacion";

export default function OriginadorLegajoPage() {
  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      {/* CABECERA */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tight">Originación</h1>
        <p className="text-gray-400 mt-2 text-sm font-bold uppercase tracking-widest">
          Paso 1: Auditoría de Riesgo
        </p>
      </div>

      {/* BLOQUE 1: SCORING Y AUDITORÍA (BCRA, CUAD, JUICIOS) */}
      <BuscadorScoringReal />

      {/* SEPARADOR VISUAL */}
      <div className="my-12 flex items-center justify-center gap-4 opacity-50">
         <div className="h-px bg-gray-800 flex-1"></div>
         <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Paso 2: Aprobación</span>
         <div className="h-px bg-gray-800 flex-1"></div>
      </div>

      {/* BLOQUE 2: ESTRUCTURA DEL CRÉDITO Y DOCUMENTACIÓN */}
      <FormularioAprobacion />

    </div>
  );
}
