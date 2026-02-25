"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, FileText, Download, ShieldCheck, Clock, Gavel } from "lucide-react";

export default function DetalleLegajo() {
  const { id } = useParams();
  const { entidadData } = useAuth();
  const [op, setOp] = useState<any>(null);
  const [procesando, setProcesando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "operaciones", id as string));
      if (snap.exists()) setOp({ id: snap.id, ...snap.data() });
    };
    load();
  }, [id]);

  const liquidarOperacion = async () => {
    if (!op || procesando) return;
    setProcesando(true);
    try {
      await updateDoc(doc(db, "operaciones", op.id), { 
        estado: "LIQUIDADO",
        fechaLiquidacion: serverTimestamp() 
      });
      alert("Operación Liquidada con éxito");
      router.push("/dashboard/cartera");
    } catch (e) {
      console.error(e);
    } finally { setProcesando(false); }
  };

  if (!op) return <div className="p-8 text-white">Cargando expediente digital...</div>;

  return (
    <div className="animate-in fade-in duration-500">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={16} /> Volver a Cartera
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* INFORMACIÓN DEL CLIENTE */}
          <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-black text-white">{op.cliente?.nombre}</h1>
                <p className="text-gray-500 font-mono text-xs italic">CUIL: {op.cliente?.cuil}</p>
              </div>
              <span className="px-4 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                {op.estado}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-900">
              <div>
                <p className="text-[10px] text-gray-600 font-black uppercase">Capital a Liquidar</p>
                <p className="text-2xl font-bold text-white">${op.financiero?.montoSolicitado?.toLocaleString('es-AR')}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 font-black uppercase">Peor Situación BCRA</p>
                <p className={`text-2xl font-bold ${op.cliente?.scoreBcra > 2 ? 'text-red-500' : 'text-green-500'}`}>
                  Cat. {op.cliente?.scoreBcra || 1}
                </p>
              </div>
            </div>
          </div>

          {/* DOCUMENTO LEGAL Y HASH */}
          <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
            <h3 className="text-sm font-black text-gray-500 uppercase mb-6 flex items-center gap-2">
              <Gavel size={16}/> Validez Jurídica
            </h3>
            <div className="flex items-center gap-6 p-6 bg-[#050505] rounded-3xl border border-gray-900">
              <div className="bg-white/5 p-4 rounded-xl">
                 <FileText className="text-amber-500" size={32} />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Contrato de Mutuo Digitalizado</p>
                <p className="text-[10px] text-gray-600 font-mono truncate max-w-xs">Hash SHA-256: {op.seguridad?.hashOperacion || "Generando..."}</p>
                <button className="mt-3 flex items-center gap-2 text-blue-500 text-xs font-bold hover:underline">
                  <Download size={14} /> Ver PDF con Firma
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DE ACCIÓN GERENCIAL */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px]">
             <h3 className="text-black font-black text-xl mb-2 flex items-center gap-2">
               <ShieldCheck size={24} className="text-green-600"/> Decisión
             </h3>
             <p className="text-xs text-gray-500 mb-8 font-medium">
               Al liquidar, se confirma el desembolso y se inicia el devengamiento de intereses punitorios (0.12% diario).
             </p>
             <button 
              onClick={liquidarOperacion}
              disabled={procesando || op.estado === "LIQUIDADO"}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
             >
               {procesando ? "Procesando..." : "Aprobar y Liquidar"}
             </button>
             <button className="w-full mt-3 text-red-600 text-xs font-black py-2 hover:bg-red-50 rounded-xl transition-all">
               Rechazar Legajo
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
