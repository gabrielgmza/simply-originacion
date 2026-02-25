"use client";

import { Bell, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { entidadData } = useAuth();
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!entidadData?.id) return;
    
    // Escuchamos alertas de riesgo y notificaciones del sistema
    const q = query(
      collection(db, "logs_operaciones"),
      where("entidadId", "==", entidadData.id),
      orderBy("fecha", "desc"),
      limit(10)
    );

    return onSnapshot(q, (snap) => {
      setNotificaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [entidadData]);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="h-16 border-b border-gray-900 bg-[#050505] flex items-center justify-end px-8 sticky top-0 z-50">
      <div className="relative">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-xl hover:bg-gray-900 transition-all relative group"
        >
          <Bell className="text-gray-400 group-hover:text-white transition-colors" size={20} />
          {notificaciones.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-[#050505] animate-pulse"></span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-4 w-96 bg-[#0A0A0A] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0D0D0D]">
              <span className="font-bold text-sm tracking-tight">Centro de Notificaciones</span>
              <button onClick={() => setShowDropdown(false)}><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="max-h-[450px] overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="p-12 text-center">
                  <Bell size={32} className="mx-auto text-gray-800 mb-3" />
                  <p className="text-xs text-gray-500">No hay novedades por ahora</p>
                </div>
              ) : notificaciones.map(n => (
                <div key={n.id} className="p-4 border-b border-gray-900 hover:bg-white/[0.03] transition-colors cursor-pointer group">
                  <div className="flex gap-4">
                    <div className="mt-1">
                      {n.accion === "ALERTA_RIESGO" ? (
                        <AlertTriangle className="text-red-500" size={16} />
                      ) : (
                        <Info className="text-blue-500" size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-200 leading-relaxed font-medium">{n.detalles}</p>
                      <p className="text-[10px] text-gray-600 mt-2 font-bold uppercase tracking-widest italic">
                         {n.accion.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
