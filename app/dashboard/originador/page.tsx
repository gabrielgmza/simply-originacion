"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { calcularOperacion } from "@/lib/financiero/calculadora";
import { Search, Save, User, MapPin, CreditCard, Landmark } from "lucide-react";

export default function OriginadorPage() {
  const { entidadData } = useAuth();
  const [paso, setPaso] = useState(1);
  const [dni, setDni] = useState("");
  const [monto, setMonto] = useState(100000);
  const [score, setScore] = useState<any>(null);

  const consultarBCRA = async () => {
    const res = await fetch("/api/bcra/consultar", { method: "POST", body: JSON.stringify({ cuil: dni }) });
    const data = await res.json();
    setScore(data); // Trae nombre automáticamente del BCRA
    setPaso(2);
  };

  const fin = calcularOperacion(monto, entidadData?.configuracion);

  return (
    <div className="max-w-6xl animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-10 italic">Originación: Legajo Completo</h1>
      
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[48px] p-12">
        {paso === 1 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" placeholder="DNI / CUIT" className="bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white outline-none" value={dni} onChange={(e) => setDni(e.target.value)} />
              <input type="number" placeholder="Capital Solicitado" className="bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white outline-none" value={monto} onChange={(e) => setMonto(Number(e.target.value))} />
            </div>
            <button onClick={consultarBCRA} className="w-full bg-[#141cff] py-5 rounded-3xl font-black text-white italic">CONSULTAR BCRA & CUAD</button>
          </div>
        ) : (
          <div className="space-y-10 animate-in zoom-in-95">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center">
                  <p className="text-[10px] text-blue-500 font-black uppercase">CFT Total</p>
                  <p className="text-2xl font-black text-white">{fin.cft}%</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Gastos (Porc.)</p>
                  <p className="text-2xl font-black text-white">${fin.gastosOtorgamiento.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 font-black uppercase">Seguro Vida</p>
                  <p className="text-2xl font-black text-white">${fin.seguroVida.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-green-600 rounded-3xl text-center">
                  <p className="text-[10px] text-white/60 font-black uppercase">Total a Liquidar</p>
                  <p className="text-2xl font-black text-white">${fin.totalALiquidar.toLocaleString()}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
                <input placeholder="Primer Nombre" className="bg-[#050505] border border-gray-800 p-4 rounded-xl text-white" />
                <input placeholder="Apellido Paterno" className="bg-[#050505] border border-gray-800 p-4 rounded-xl text-white" />
             </div>

             <button className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase tracking-widest">Generar Legajo y Firmar</button>
          </div>
        )}
      </div>
    </div>
  );
}
