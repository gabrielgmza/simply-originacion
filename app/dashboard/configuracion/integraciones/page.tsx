"use client";
import { useState } from "react";
import { Save, Lock, Landmark } from "lucide-react";

export default function ConfigIntegraciones() {
  const [credenciales, setCredenciales] = useState({ usuario: "", password: "" });

  return (
    <div className="p-10 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white italic mb-10 tracking-tighter uppercase">Integraciones Gubernamentales</h1>
      
      <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px] max-w-2xl space-y-6">
        <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Landmark size={14}/> Portal de Descuentos (Gob. Mendoza)
        </h2>
        <p className="text-gray-500 text-sm">Ingrese las credenciales de su entidad para que el sistema consulte automáticamente el cupo de los empleados públicos en <b>descuentos.mendoza.gov.ar</b>.</p>
        
        <div className="space-y-4 pt-4">
          <div className="bg-black border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
            <Lock size={18} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Usuario / Código de Entidad" 
              className="bg-transparent text-white outline-none w-full"
              value={credenciales.usuario}
              onChange={(e) => setCredenciales({...credenciales, usuario: e.target.value})}
            />
          </div>
          <div className="bg-black border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
            <Lock size={18} className="text-gray-500" />
            <input 
              type="password" 
              placeholder="Contraseña" 
              className="bg-transparent text-white outline-none w-full"
              value={credenciales.password}
              onChange={(e) => setCredenciales({...credenciales, password: e.target.value})}
            />
          </div>
        </div>

        <button className="w-full mt-6 bg-white text-black py-4 rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-gray-200 transition-all uppercase">
          <Save size={18}/> Guardar Credenciales
        </button>
      </div>
    </div>
  );
}
