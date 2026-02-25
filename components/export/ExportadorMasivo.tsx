"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FileDown, FileArchive, Loader2, CheckCircle } from "lucide-react";

interface Props {
  operaciones: any[];
  entidadNombre: string;
}

export default function ExportadorMasivo({ operaciones, entidadNombre }: Props) {
  const [procesando, setProcesando] = useState(false);
  const [completado, setCompletado] = useState(false);

  const exportarZip = async () => {
    setProcesando(true);
    const zip = new JSZip();
    
    operaciones.forEach((op) => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("LEGAJO DE CRÉDITO", 10, 20);
      doc.setFontSize(10);
      doc.text(`Cliente: ${op.cliente.apellidoPaterno}, ${op.cliente.primerNombre}`, 10, 40);
      doc.text(`DNI: ${op.cliente.dni}`, 10, 50);
      doc.text(`CUIL: ${op.cliente.cuil}`, 10, 60);
      doc.text(`CBU: ${op.cliente.cbu}`, 10, 70);
      doc.text(`Monto Bruto: $${op.financiero.montoBruto}`, 10, 90);
      doc.text(`Monto Neto: $${op.financiero.montoNeto}`, 10, 100);
      doc.text(`TNA: ${op.financiero.tna}% - CFT: ${op.financiero.cft}%`, 10, 110);
      
      const content = doc.output("blob");
      zip.file(`Legajo_${op.cliente.dni}.pdf`, content);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `Exportacion_${entidadNombre}.zip`);
    finalizar();
  };

  const finalizar = () => {
    setProcesando(false);
    setCompletado(true);
    setTimeout(() => setCompletado(false), 3000);
  };

  return (
    <div className="flex gap-3">
      <button 
        onClick={exportarZip}
        disabled={procesando}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-gray-800 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
      >
        {procesando ? <Loader2 className="animate-spin" size={16} /> : completado ? <CheckCircle className="text-green-500" size={16} /> : <FileArchive size={16} />} 
        Exportar Legajos (.ZIP)
      </button>
    </div>
  );
}
