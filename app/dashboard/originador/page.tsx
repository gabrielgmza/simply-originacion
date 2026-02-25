"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, ShieldCheck, PenTool, Save, Loader2, Landmark } from "lucide-react";

export default function OriginadorPage() {
  const { entidadData } = useAuth();
  const [paso, setPaso] = useState(1);
  const [dni, setDni] = useState("");
  const [monto, setMonto] = useState(100000);
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const consultarBCRA = async () => {
    setLoading(true);
    const res = await fetch("/api/bcra/consultar", { method: "POST", body: JSON.stringify({ cuil: dni }) });
    const data = await res.json();
    setScore(data);
    setLoading(false);
    setPaso(2);
  };

  // CÁLCULO DE GASTOS PORCENTUALES (Ej: 10% del monto)
  const tasaGasto = 0.10; 
  const gastoCalculado = monto * tasaGasto;
  const totalOperacion = Number(monto) + gastoCalculado;

  return (
    <div className="max-w-4xl animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-10 italic tracking-tighter">Originación Pro</h1>
      
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[48px] p-10">
        {paso === 1 && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-blue-500 flex items-center gap-2 underline">Paso 1: Riesgo & Identidad</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input type="text" placeholder="DNI / CUIT" className="bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white outline-none" value={dni} onChange={(e) => setDni(e.target.value)} />
               <input type="number" placeholder="Monto Solicitado" className="bg-[#050505] border border-gray-700 p-5 rounded-2xl text-white outline-none" value={monto} onChange={(e) => setMonto(Number(e.target.value))} />
            </div>
            <button onClick={consultarBCRA} disabled={loading} className="w-full bg-[#141cff] py-5 rounded-2xl font-black text-white">{loading ? "Validando..." : "Consultar BCRA"}</button>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-10 animate-in zoom-in-95">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                  <p className="text-[10px] text-gray-600 font-black uppercase">Capital</p>
                  <p className="text-xl font-bold text-white">${monto.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                  <p className="text-[10px] text-blue-500 font-black uppercase">Gastos (Porcentual)</p>
                  <p className="text-xl font-bold text-blue-400">${gastoCalculado.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                  <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Total Legajo</p>
                  <p className="text-xl font-black text-white">${totalOperacion.toLocaleString()}</p>
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2"><PenTool size={16}/> Firma Presencial</h3>
                <canvas ref={canvasRef} width={600} height={200} className="w-full bg-white rounded-3xl border-2 border-gray-900 cursor-crosshair" />
                <button onClick={() => setPaso(1)} className="text-xs text-gray-600 underline">Volver a editar monto</button>
             </div>

             <button className="w-full bg-[#141cff] py-5 rounded-[32px] font-black text-white flex justify-center items-center gap-3">
                <Save size={20}/> Guardar Operación y Notificar
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
