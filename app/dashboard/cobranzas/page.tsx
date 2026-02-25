"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Phone, MessageSquare, AlertCircle, Clock, DollarSign, Search } from "lucide-react";

export default function CobranzasPage() {
  const { entidadData } = useAuth();
  const [mora, setMora] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("TODOS");

  useEffect(() => {
    const cargarMora = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id), where("estado", "==", "EN_MORA"));
      const snap = await getDocs(q);
      setMora(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    cargarMora();
  }, [entidadData]);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Phone style={{ color: colorPrimario }} /> Centro de Recupero
        </h1>
        <p className="text-gray-400">Gestión de cartera morosa y compromisos de pago.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Clock size={24} /></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">Mora Temprana (1-30d)</p><p className="text-xl font-black">14 Casos</p></div>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><AlertCircle size={24} /></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">Mora Tardía (+90d)</p><p className="text-xl font-black">3 Casos</p></div>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><DollarSign size={24} /></div>
          <div><p className="text-xs text-gray-500 uppercase font-bold">Compromisos Hoy</p><p className="text-xl font-black">8 Clientes</p></div>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-500 uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="p-5">Cliente</th>
              <th className="p-5">Días Mora</th>
              <th className="p-5">Capital Original</th>
              <th className="p-5">Punitorios</th>
              <th className="p-5">Deuda Total</th>
              <th className="p-5">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {mora.map((m) => (
              <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-5">
                  <p className="font-bold text-white">{m.cliente.apellidoPaterno}, {m.cliente.primerNombre}</p>
                  <p className="text-xs text-gray-500">{m.cliente.telefono}</p>
                </td>
                <td className="p-5"><span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-md font-bold">12 días</span></td>
                <td className="p-5">${m.financiero.montoBruto.toLocaleString('es-AR')}</td>
                <td className="p-5 text-amber-500">+$1.450,20</td>
                <td className="p-5 font-black text-white">$11.450,20</td>
                <td className="p-5">
                  <div className="flex gap-2">
                    <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-all"><MessageSquare size={16} /></button>
                    <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-all"><Phone size={16} /></button>
                    <button className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase transition-all">Gestionar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
