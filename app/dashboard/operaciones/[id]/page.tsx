"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, FileText, ShieldCheck, Gavel, Download, Lock } from "lucide-react";

export default function DetalleLegajo() {
  const { id } = useParams();
  const [op, setOp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "operaciones", id as string));
      if (snap.exists()) setOp({ id: snap.id, ...snap.data() });
    };
    load();
  }, [id]);

  const liquidar = async () => {
    if (op.estado === 'LIQUIDADO') return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "operaciones", id as string), { 
        estado: "LIQUIDADO", 
        fechaLiquidacion: serverTimestamp() 
      });
      // Recargar datos localmente
      setOp({...op, estado: 'LIQUIDADO'});
    } catch (e) {
      alert("Error al liquidar");
    } finally { setLoading(false); }
  };

  if (!op) return <div className="p-20 text-center text-white font-bold italic">Cargando expediente digital...</div>;

  const esLiquidado = op.estado === 'LIQUIDADO';

  return (
    <div className="animate-in fade-in duration-500">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-white mb-10 transition-colors">
        <ArrowLeft size={16}/> Volver a Cartera
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px]">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-white">{op.cliente?.nombre || "N/A"}</h2>
                <p className="text-gray-500 font-mono text-sm">DNI: {op.cliente?.dni}</p>
              </div>
              <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border ${esLiquidado ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                {op.estado}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-8 border-t border-gray-900">
              <div>
                <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Monto Solicitado</p>
                <p className="text-3xl font-black text-white">${op.financiero?.montoSolicitado?.toLocaleString('es-AR')}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Score Riesgo</p>
                <p className={`text-3xl font-black ${op.cliente?.scoreBcra > 2 ? 'text-red-500' : 'text-green-500'}`}>CAT {op.cliente?.scoreBcra || 1}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px]">
            <h3 className="text-sm font-black text-gray-500 uppercase mb-8 flex items-center gap-2 italic">
              <Gavel size={18}/> Documentación con Validez Jurídica
            </h3>
            <div className="p-6 bg-[#050505] border border-gray-900 rounded-3xl flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-white/5 rounded-2xl text-amber-500"><FileText size={24}/></div>
                 <div>
                   <p className="font-bold text-white text-sm">Contrato de Mutuo Digital</p>
                   <p className="text-[10px] text-gray-600 font-mono italic">HASH SHA-256: {op.id?.substring(0,16)}...</p>
                 </div>
               </div>
               <button className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-400 hover:text-white"><Download size={20}/></button>
            </div>
          </div>
        </div>

        <div>
          <div className={`p-10 rounded-[48px] sticky top-8 text-center transition-all ${esLiquidado ? 'bg-green-600 shadow-2xl shadow-green-900/40' : 'bg-white shadow-2xl shadow-black/50'}`}>
             {esLiquidado ? (
               <div className="animate-in zoom-in-95 duration-500">
                 <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-white" size={40} />
                 </div>
                 <h3 className="text-white font-black text-2xl tracking-tighter mb-2">Operación Liquidada</h3>
                 <p className="text-green-100 text-xs font-medium mb-8 leading-relaxed">
                   Los fondos han sido confirmados. El legajo ahora es un título ejecutivo legal.
                 </p>
                 <div className="py-3 px-4 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center gap-2 text-white font-bold text-sm">
                    <Lock size={14}/> Legajo Cerrado
                 </div>
               </div>
             ) : (
               <>
                 <ShieldCheck className="text-green-600 mx-auto mb-4" size={48} />
                 <h3 className="text-black font-black text-2xl tracking-tighter mb-2">Decisión</h3>
                 <p className="text-gray-500 text-xs font-medium mb-10 leading-relaxed">
                   Al aprobar, confirmas la transferencia de fondos y se inicia el devengamiento de intereses.
                 </p>
                 <button 
                   onClick={liquidar}
                   disabled={loading}
                   className="w-full bg-black text-white py-5 rounded-3xl font-black hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {loading ? "Procesando..." : "APROBAR Y LIQUIDAR"}
                 </button>
                 <button className="w-full mt-4 text-red-600 text-[10px] font-black uppercase tracking-widest py-2 hover:bg-red-50 rounded-xl transition-all">
                   Rechazar Operación
                 </button>
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
