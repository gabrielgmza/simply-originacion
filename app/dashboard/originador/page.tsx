"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, ShieldCheck, CreditCard, Loader2, PenTool, Save, Lock } from "lucide-react";

export default function OriginadorPage() {
  const { entidadData } = useAuth();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dni, setDni] = useState("");
  const [score, setScore] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const consultarBCRA = async () => {
    setLoading(true);
    const res = await fetch("/api/bcra/consultar", { method: "POST", body: JSON.stringify({ cuil: dni }) });
    const data = await res.json();
    setScore(data);
    setLoading(false);
    setPaso(2);
  };

  const limpiarFirma = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, 400, 200);
  };

  const gasto = entidadData?.configuracion?.gastosOtorgamiento || 0;

  return (
    <div className="max-w-4xl animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-8 italic">Originador de Crédito</h1>
      
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[40px] p-10">
        {paso === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-blue-500 flex items-center gap-2"><Search size={20}/> Validación BCRA</h2>
            <input type="text" placeholder="CUIT/CUIL" className="w-full bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white text-xl text-center" value={dni} onChange={(e) => setDni(e.target.value)} />
            <button onClick={consultarBCRA} disabled={loading} className="w-full bg-[#141cff] py-5 rounded-2xl font-black text-white">{loading ? "Consultando..." : "Verificar Riesgo"}</button>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-[10px] font-black text-gray-500 uppercase">Capital + Gastos</p>
                <p className="text-2xl font-black text-white">$148.500</p>
                <p className="text-[10px] text-gray-600">Incluye ${gasto} de otorgamiento</p>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Situación</p>
                <p className="text-2xl font-black text-green-500">CAT {score?.situacionCrediticia}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2"><PenTool size={16}/> Firma del Cliente (Presencial)</h3>
              <canvas ref={canvasRef} width={400} height={200} className="w-full bg-white rounded-2xl border-2 border-gray-800 cursor-crosshair" />
              <div className="flex gap-4">
                <button onClick={limpiarFirma} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold">Limpiar</button>
                <button onClick={() => setPaso(1)} className="flex-1 py-3 border border-gray-800 text-gray-500 rounded-xl text-xs font-bold">Cancelar</button>
              </div>
            </div>
            
            <button className="w-full bg-[#141cff] py-5 rounded-3xl font-black text-white flex items-center justify-center gap-3">
              <Save size={20}/> Finalizar y Generar Legajo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
