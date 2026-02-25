"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, User, MapPin, CreditCard, Upload } from "lucide-react";

export default function OriginadorPage() {
  const [paso, setPaso] = useState(1);
  const [monto, setMonto] = useState(100000);
  
  return (
    <div className="max-w-6xl p-8 animate-in slide-in-from-bottom-4">
      <h1 className="text-3xl font-black text-white mb-8 italic">Nuevo Legajo Digital</h1>
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[48px] p-12">
        {paso === 1 ? (
          <div className="grid grid-cols-2 gap-6">
            <input placeholder="Primer Nombre" className="bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white" />
            <input placeholder="Apellido Paterno" className="bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white" />
            <input placeholder="DNI / CUIL (Único)" className="bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white col-span-2" />
            <button onClick={() => setPaso(2)} className="col-span-2 bg-[#141cff] py-5 rounded-3xl font-black text-white">CONTINUAR A DATOS BANCARIOS</button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <input placeholder="Banco" className="bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white" />
              <input placeholder="CBU / Alias" className="bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white" />
            </div>
            <div className="p-10 border-2 border-dashed border-gray-800 rounded-3xl text-center">
              <Upload className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-500 text-sm">Cargar Comprobante de Transferencia (Opcional)</p>
            </div>
            <button className="w-full bg-white text-black py-5 rounded-3xl font-black">FINALIZAR Y NOTIFICAR CLIENTE</button>
          </div>
        )}
      </div>
    </div>
  );
}
