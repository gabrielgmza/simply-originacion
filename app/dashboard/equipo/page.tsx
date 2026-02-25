"use client";
import { useState } from "react";
import { UserPlus, Shield, MapPin, Save } from "lucide-react";

export default function GestionEquipoSucursales() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-black text-white mb-10 italic">Personal y Ramificación</h1>
      <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px] space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Email del Usuario</label>
            <input placeholder="ejemplo@simply.com" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Asignar Sucursal</label>
            <select className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none">
              <option>Casa Central</option>
              <option>San Rafael</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Rol de Acceso</label>
            <select className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none font-bold text-blue-500">
              <option>VENDEDOR</option>
              <option>LIQUIDADOR</option>
              <option>GERENTE SUCURSAL</option>
            </select>
          </div>
        </div>
        <button className="bg-white text-black px-10 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-200 transition-all">
          <UserPlus size={18}/> DAR ALTA EN SUCURSAL
        </button>
      </div>
    </div>
  );
}
