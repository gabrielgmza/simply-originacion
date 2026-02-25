"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Landmark, Plus, Loader2, ArrowLeft, Percent, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FondeadoresPage() {
  const { entidadData } = useAuth();
  const router = useRouter();
  const [fondeadores, setFondeadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const [form, setForm] = useState({
    nombre: "",
    tnaPropia: 0,
    plazoMaximo: 12,
    comisionEntidad: 0
  });

  const cargarFondeadores = async () => {
    if (!entidadData?.id) return;
    const q = query(collection(db, "fondeadores"), where("entidadId", "==", entidadData.id));
    const snap = await getDocs(q);
    setFondeadores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setCargando(false);
  };

  useEffect(() => { cargarFondeadores(); }, [entidadData]);

  const agregarFondeador = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "fondeadores"), {
      entidadId: entidadData.id,
      ...form,
      activo: true,
      fechaCreacion: serverTimestamp()
    });
    setForm({ nombre: "", tnaPropia: 0, plazoMaximo: 12, comisionEntidad: 0 });
    cargarFondeadores();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto text-white">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} /> Volver
      </button>
      <div className="mb-8 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Landmark className="text-[#FF5E14]" /> Fondeadores
        </h1>
        <p className="text-gray-400">Proveedores de capital externos con tasas y condiciones propias.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={agregarFondeador} className="bg-[#0A0A0A] p-6 rounded-xl border border-gray-800 h-fit space-y-4 shadow-2xl">
          <h2 className="font-bold mb-4 text-[#FF5E14]">Nuevo Fondeador</h2>
          <div>
            <label className="text-xs text-gray-500 uppercase">Nombre del Fondeador</label>
            <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:border-[#FF5E14] outline-none" placeholder="Ej: Inversora del Sur" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase">TNA (%)</label>
              <input type="number" step="0.01" value={form.tnaPropia} onChange={e => setForm({...form, tnaPropia: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:border-[#FF5E14] outline-none" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Plazo Máx.</label>
              <input type="number" value={form.plazoMaximo} onChange={e => setForm({...form, plazoMaximo: Number(e.target.value)})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:border-[#FF5E14] outline-none" required />
            </div>
          </div>
          <button className="w-full bg-[#FF5E14] py-3 rounded-lg font-bold hover:bg-[#e05212] transition-colors">
            Registrar Fondeador
          </button>
        </form>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {cargando ? <Loader2 className="animate-spin col-span-2 mx-auto" /> : fondeadores.map(f => (
            <div key={f.id} className="bg-[#0A0A0A] border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-[#FF5E14] transition-colors">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                <Landmark size={48} />
              </div>
              <h3 className="font-bold text-xl mb-4 text-white">{f.nombre}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center gap-1"><Percent size={14} /> Tasa Base (TNA)</span>
                  <span className="text-white font-bold">{f.tnaPropia}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center gap-1"><Clock size={14} /> Plazo Máximo</span>
                  <span className="text-white font-bold">{f.plazoMaximo} cuotas</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
