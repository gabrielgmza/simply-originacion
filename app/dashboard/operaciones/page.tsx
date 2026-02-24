'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] p-5 rounded-3xl shadow-2xl border-4 ${type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'} text-white font-black text-xs uppercase tracking-widest animate-in slide-in-from-top-4`}>
      {message}
    </div>
  );
};

export default function OperacionesPage() {
  const [ops, setOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOp, setSelectedOp] = useState<any>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) fetchOps();
    });
    return () => unsub();
  }, []);

  const fetchOps = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'operaciones'), orderBy('fechaCreacion', 'desc'));
      const snap = await getDocs(q);
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleLiquidar = async (id: string) => {
    try {
      await updateDoc(doc(db, 'operaciones', id), { estado: 'LIQUIDADO' });
      setToast({message: "CRÉDITO LIQUIDADO CON ÉXITO", type: "success"});
      fetchOps();
    } catch (e) { setToast({message: "ERROR AL LIQUIDAR", type: "error"}); }
  };

  // Función para generar la tabla visual en el momento
  const generarTablaAmortizacion = (op: any) => {
    const table = [];
    let saldo = op.monto;
    const n = op.cuotas;
    const valorCuota = op.valorCuota;
    
    for (let i = 1; i <= n; i++) {
      table.push({
        nro: i,
        cuota: valorCuota,
        vencimiento: "Próx. Mes"
      });
    }
    return table;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-6 bg-slate-50 min-h-screen font-black">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex justify-between items-end border-b-8 border-slate-200 pb-6">
         <h1 className="text-5xl uppercase italic tracking-tighter text-slate-900">Bandeja de Créditos</h1>
         <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.4em]">Gestión de Cartera</p>
            <p className="text-xl text-blue-600 uppercase italic">Simply SaaS Engine</p>
         </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border-4 border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-widest">
              <th className="p-6 border-r border-slate-700">Cliente / DNI</th>
              <th className="p-6 border-r border-slate-700">Entidad</th>
              <th className="p-6 border-r border-slate-700">Monto / Plan</th>
              <th className="p-6 border-r border-slate-700">Cuota</th>
              <th className="p-6 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-slate-50">
            {ops.map(op => (
              <tr key={op.id} className="hover:bg-blue-50 transition-colors border-b-2 border-slate-100">
                <td className="p-6 border-r-2 border-slate-100">
                  <p className="text-lg text-slate-950 uppercase italic leading-none">{op.clienteNombre}</p>
                  <p className="text-xs text-blue-600 mt-1">DNI {op.clienteDni}</p>
                </td>
                <td className="p-6 border-r-2 border-slate-100 uppercase text-xs">
                  {op.entidadNombre}
                </td>
                <td className="p-6 border-r-2 border-slate-100">
                  <p className="text-xl text-slate-900">${op.monto?.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{op.cuotas} Cuotas ({op.sistema})</p>
                </td>
                <td className="p-6 border-r-2 border-slate-100">
                  <p className="text-xl text-emerald-600">${op.valorCuota?.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                </td>
                <td className="p-6 text-center space-x-2">
                  <button onClick={() => setSelectedOp(op)} className="bg-slate-100 p-3 rounded-2xl border-2 border-slate-300 hover:bg-white transition-all text-[10px] uppercase">Ver Tabla</button>
                  {op.estado !== 'LIQUIDADO' ? (
                    <button onClick={() => handleLiquidar(op.id)} className="bg-blue-600 text-white p-3 rounded-2xl border-2 border-blue-800 hover:bg-blue-700 transition-all text-[10px] uppercase">Liquidar</button>
                  ) : (
                    <span className="text-emerald-600 text-[10px] uppercase font-black">Pagado ✓</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE TABLA DE AMORTIZACIÓN */}
      {selectedOp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] border-8 border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div>
                   <h2 className="text-4xl uppercase italic tracking-tighter">Proyección de Pagos</h2>
                   <p className="text-blue-400 text-xs uppercase tracking-[0.3em] mt-1">Sistema {selectedOp.sistema} • {selectedOp.entidadNombre}</p>
                </div>
                <button onClick={() => setSelectedOp(null)} className="bg-white/10 hover:bg-white/20 p-4 rounded-3xl transition-all">✕</button>
             </div>
             <div className="p-10 max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="border-b-4 border-slate-100">
                    <tr className="text-[10px] uppercase text-slate-400 tracking-widest">
                      <th className="pb-4">Nro</th>
                      <th className="pb-4">Concepto</th>
                      <th className="pb-4">Vencimiento</th>
                      <th className="pb-4 text-right">Importe Cuota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-50">
                    {generarTablaAmortizacion(selectedOp).map(row => (
                      <tr key={row.nro} className="text-slate-900">
                        <td className="py-4 font-black">{row.nro}</td>
                        <td className="py-4 text-xs uppercase opacity-60">Cuota Amortización</td>
                        <td className="py-4 text-xs uppercase font-bold text-blue-600 italic">30 Días</td>
                        <td className="py-4 text-right font-black text-xl">${row.cuota.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="p-10 bg-slate-50 border-t-4 border-slate-100 flex justify-between items-center">
                <p className="text-xs text-slate-400 italic">Este documento es una simulación basada en los parámetros core cargados.</p>
                <button onClick={() => setSelectedOp(null)} className="bg-slate-900 text-white px-10 py-4 rounded-3xl uppercase tracking-widest text-xs">Cerrar Detalle</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
