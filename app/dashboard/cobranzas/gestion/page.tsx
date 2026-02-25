"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, Calendar, User, PhoneCall, CheckCircle2, AlertCircle, Save, Loader2 } from "lucide-react";

export default function GestionCobranzas() {
  const { entidadData } = useAuth();
  const [casos, setCasos] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [nota, setNota] = useState("");
  const [fechaPromesa, setFechaPromesa] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargarCasosMora = async () => {
      if (!entidadData?.id) return;
      const q = query(collection(db, "operaciones"), where("entidadId", "==", entidadData.id), where("estado", "==", "EN_MORA"));
      const snap = await getDocs(q);
      setCasos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    cargarCasosMora();
  }, [entidadData]);

  const registrarGestion = async () => {
    if (!seleccionado || !nota) return;
    setLoading(true);
    try {
      // 1. Registrar el log de la gestión
      await addDoc(collection(db, "logs_cobranzas"), {
        operacionId: seleccionado.id,
        entidadId: entidadData.id,
        detalle: nota,
        fechaPromesa: fechaPromesa || null,
        fechaGestion: serverTimestamp(),
        agente: entidadData.nombre // O el nombre del usuario actual
      });

      // 2. Actualizar la operación con la fecha de promesa si existe
      if (fechaPromesa) {
        await updateDoc(doc(db, "operaciones", seleccionado.id), {
          "cobranzas.ultima_promesa": fechaPromesa,
          "cobranzas.estado_gestion": "CON_PROMESA"
        });
      }
      
      alert("Gestión registrada correctamente");
      setNota("");
      setFechaPromesa("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <div className="mb-10 flex justify-between items-end border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <PhoneCall style={{ color: colorPrimario }} /> Panel de Gestión Activa
          </h1>
          <p className="text-gray-400">Interacción directa y registro de promesas de pago.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LISTADO DE MOROSOS */}
        <div className="lg:col-span-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {casos.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSeleccionado(c)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${seleccionado?.id === c.id ? 'border-[#FF5E14] bg-[#FF5E14]/10' : 'border-gray-800 bg-[#0A0A0A] hover:bg-white/5'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-500">Mora {c.diasMora || '12'} Días</span>
                <MessageSquare size={14} className="text-gray-600" />
              </div>
              <p className="font-bold text-sm">{c.cliente.apellidoPaterno}, {c.cliente.primerNombre}</p>
              <p className="text-xs text-gray-500 mb-2">{c.cliente.cuil}</p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Deuda:</span>
                <span className="font-bold text-white">${c.financiero.montoBruto.toLocaleString('es-AR')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ÁREA DE GESTIÓN */}
        <div className="lg:col-span-8">
          {!seleccionado ? (
            <div className="h-full border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-600 p-12 text-center">
              <User size={48} className="mb-4 opacity-10" />
              <p>Selecciona un cliente de la lista para iniciar la gestión de cobro.</p>
            </div>
          ) : (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-3xl p-8 animate-in fade-in duration-300">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold">{seleccionado.cliente.apellidoPaterno}, {seleccionado.cliente.primerNombre}</h2>
                  <p className="text-blue-500 text-sm font-medium">WhatsApp: {seleccionado.cliente.telefono}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold">Saldo Exigible</p>
                  <p className="text-3xl font-black text-white">$14.250,00</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Resultado de la Gestión / Notas</label>
                  <textarea 
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    className="w-full bg-[#050505] border border-gray-800 rounded-2xl p-4 text-sm focus:border-gray-600 outline-none h-32 resize-none"
                    placeholder="Ej: El cliente indica que tuvo un problema con su CBU. Promete pagar el viernes..."
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fecha Promesa de Pago</label>
                    <input 
                      type="date" 
                      value={fechaPromesa}
                      onChange={(e) => setFechaPromesa(e.target.value)}
                      className="w-full bg-[#050505] border border-gray-800 rounded-2xl p-4 text-sm outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={registrarGestion}
                      disabled={loading}
                      className="w-full py-4 rounded-2xl font-bold flex justify-center items-center gap-2 transition-all hover:brightness-110"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Save />} Registrar Gestión
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-10 border-t border-gray-900">
                <h3 className="text-xs font-black uppercase text-gray-600 tracking-widest mb-4">Historial de Contacto</h3>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="p-2 bg-white/5 rounded-full"><AlertCircle size={14} className="text-amber-500" /></div>
                    <div>
                      <p className="text-xs text-gray-300">Se envió recordatorio preventivo automático de 48hs.</p>
                      <p className="text-[10px] text-gray-600 mt-1">Hace 3 días - Sistema</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
