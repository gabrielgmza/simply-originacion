"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Key, Bell, Shield, LogOut, Clock, Smartphone } from "lucide-react";

export default function PerfilEmpleado() {
  const { userData, entidadData } = useAuth();
  const [sessionTimeout, setSessionTimeout] = useState("30");

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-4xl mx-auto text-white animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-bold flex items-center gap-3">Mi Configuración</h1>
        <p className="text-gray-400">Gestiona tu seguridad y preferencias de notificaciones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#0A0A0A] p-8 rounded-3xl border border-gray-800 text-center">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center font-black text-3xl uppercase" style={{ backgroundColor: colorPrimario }}>
              {userData?.email[0]}
            </div>
            <p className="font-bold truncate">{userData?.email}</p>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">{userData?.rol}</p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#0A0A0A] p-8 rounded-3xl border border-gray-800">
            <h3 className="text-sm font-black uppercase text-gray-500 tracking-widest mb-6 flex items-center gap-2">
              <Shield size={16} /> Seguridad de Cuenta
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Clock className="text-gray-400" size={18} />
                  <div>
                    <p className="text-sm font-bold">Caducidad de Sesión</p>
                    <p className="text-[10px] text-gray-500">Cierre automático por inactividad</p>
                  </div>
                </div>
                <select 
                  value={sessionTimeout} 
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="bg-[#050505] border border-gray-700 rounded-lg p-2 text-xs outline-none"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                </select>
              </div>

              <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                <div className="flex items-center gap-3"><Key size={18}/> Cambiar Contraseña</div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
