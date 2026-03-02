"use client";
import { useState } from "react";
import BuscadorScoringReal from "./buscador-real";
import FormularioAprobacion from "./formulario-aprobacion";

export default function OriginadorLegajoPage() {
  // ACA GUARDAMOS EL DNI QUE EL BUSCADOR ENCONTRO EXISOTAMENTE
  const [dniBuscado, setDniBuscado] = useState("");

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-12">
      
      {/* CABECERA */}
      <div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tight">Originación</h1>
        <p className="text-gray-400 mt-2 text-sm font-bold uppercase tracking-widest">
          Paso 1: Auditoría de Riesgo
        </p>
      </div>

      {/* BLOQUE 1: SCORING Y AUDITORÍA (BCRA, CUAD, JUICIOS) */}
      {/* Le pasamos la función para que el buscador nos avise cuál DNI encontró */}
      <BuscadorScoringReal alBuscarExitosamente={setDniBuscado} />

      {/* SEPARADOR VISUAL */}
      <div className="flex items-center justify-center gap-4 opacity-50">
         <div className="h-px bg-gray-800 flex-1"></div>
         <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Paso 2: Aprobación</span>
         <div className="h-px bg-gray-800 flex-1"></div>
      </div>

      {/* BLOQUE 2: ESTRUCTURA DEL CRÉDITO Y DOCUMENTACIÓN */}
      {/* Solo mostramos el formulario si hay un DNI buscado y auditado */}
      {dniBuscado ? (
          <FormularioAprobacion dniBuscado={dniBuscado} />
      ) : (
          <div className="bg-[#0A0A0A] border-2 border-dashed border-gray-800 rounded-[32px] p-12 text-center text-gray-600 font-bold uppercase tracking-widest text-sm animate-in fade-in">
              Primero audite un cliente para habilitar la aprobación
          </div>
      )}

    </div>
  );
}
