"use client";
import { useState, useEffect } from "react";
import { MapPin, Shield, UserPlus, MoreVertical, Lock, Unlock } from "lucide-react";

export default function EquipoSucursales() {
  const [usuarios, setUsuarios] = useState([
    { id: 1, email: "vendedor1@mendoza.com", rol: "VENDEDOR", sucursal: "Casa Central", activo: true },
    { id: 2, email: "supervisor@sanrafael.com", rol: "SUPERVISOR_SUCURSAL", sucursal: "San Rafael", activo: true }
  ]);

  return (
    <div className="p-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">Equipo & Ramificación de Roles</h1>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <UserPlus size={18}/> Invitar Empleado
        </button>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-[40px] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] border-b border-gray-900">
            <tr>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Empleado</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Sucursal Asignada</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Rol</th>
              <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {usuarios.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                <td className="p-6 font-bold text-white">{u.email}</td>
                <td className="p-6">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin size={14}/> {u.sucursal}
                  </div>
                </td>
                <td className="p-6">
                  <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                    {u.rol}
                  </span>
                </td>
                <td className="p-6">
                  <button className="text-gray-600 hover:text-white transition-colors"><MoreVertical size={20}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
