"use client";
import BuscadorScoringReal from "./buscador-real";

export default function PaginaLegajoReal() {
  return (
    <div className="p-10 max-w-5xl mx-auto space-y-10">
      <header>
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Originación de Legajo</h1>
        <p className="text-gray-500 font-medium italic">Validación de identidad, situación BCRA y Registro Judicial de Mendoza.</p>
      </header>

      <section className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px]">
        <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8">1. Consulta de Scoring y Antecedentes</h2>
        <BuscadorScoringReal />
      </section>
      
      {/* El resto del formulario se habilitará solo si el scoring es apto */}
    </div>
  );
}
