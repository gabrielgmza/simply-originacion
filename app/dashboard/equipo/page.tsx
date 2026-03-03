"use client";
import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs, doc,
  updateDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Users, MapPin, Pencil, Save, Loader2, X, CheckCircle2 } from "lucide-react";

const ROLES = [
  { value: "GERENTE_GENERAL",     label: "Gerente General" },
  { value: "GERENTE_SUCURSAL",    label: "Gerente Sucursal" },
  { value: "SUPERVISOR_SUCURSAL", label: "Supervisor" },
  { value: "VENDEDOR",            label: "Vendedor" },
  { value: "LIQUIDADOR",          label: "Liquidador" },
  { value: "COBRANZAS",           label: "Cobranzas" },
];

export default function EquipoPage() {
  const { entidadData, userData } = useAuth();
  const [usuarios, setUsuarios]     = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editando, setEditando]     = useState<any>(null);
  const [guardando, setGuardando]   = useState(false);
  const [guardado, setGuardado]     = useState(false);
  const [busqueda, setBusqueda]     = useState("");

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const puedeGestionar = ["GERENTE_GENERAL","MASTER_PAYSUR"].includes(userData?.rol || "");

  const cargar = async () => {
    if (!entidadData?.id) return;
    setLoading(true);
    try {
      const [usSnap, sucSnap] = await Promise.all([
        getDocs(query(collection(db, "usuarios"), where("entidadId","==",entidadData.id))),
        getDocs(query(collection(db, "sucursales"), where("entidadId","==",entidadData.id), where("activa","==",true))),
      ]);
      setUsuarios(usSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [entidadData]);

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "usuarios", editando.id), {
        sucursalId: editando.sucursalId || null,
        rol: editando.rol,
        activo: editando.activo,
        fechaActualizacion: serverTimestamp(),
      });
      setEditando(null);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
      cargar();
    } catch { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  const nombreSucursal = (id?: string) =>
    sucursales.find(s => s.id === id)?.nombre || "Sin asignar";

  const filtrados = usuarios.filter(u =>
    u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Equipo</h1>
          <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuarios · {sucursales.length} sucursales activas</p>
        </div>
        {guardado && <span className="flex items-center gap-2 text-green-400 text-sm font-bold"><CheckCircle2 size={16}/> Guardado</span>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 flex items-center gap-3 max-w-sm">
        <Users size={15} className="text-gray-500"/>
        <input placeholder="Buscar por nombre o email..." className="bg-transparent text-sm text-white outline-none flex-1"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-600" size={28}/></div>
      ) : (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                {["Usuario","Rol","Sucursal","Estado",""].map((h,i) => (
                  <th key={i} className="px-5 py-3.5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {filtrados.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-white text-sm">{u.nombre}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-gray-800 text-gray-300">
                      {u.rol?.replace(/_/g," ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <MapPin size={11}/> {nombreSucursal(u.sucursalId)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${u.activo ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {puedeGestionar && (
                      <button onClick={() => setEditando({...u})} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                        <Pencil size={14}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-600 py-12 text-sm">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-black text-white">{editando.nombre}</h2>
                <p className="text-xs text-gray-500">{editando.email}</p>
              </div>
              <button onClick={() => setEditando(null)}><X size={18} className="text-gray-500"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1.5">Rol</label>
                <select value={editando.rol} onChange={e => setEditando((p:any) => ({...p, rol: e.target.value}))}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1.5">Sucursal</label>
                <select value={editando.sucursalId || ""} onChange={e => setEditando((p:any) => ({...p, sucursalId: e.target.value || null}))}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
                  <option value="">Sin asignar</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-300 font-bold">Usuario activo</span>
                <button onClick={() => setEditando((p:any) => ({...p, activo: !p.activo}))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editando.activo ? "bg-green-500" : "bg-gray-700"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${editando.activo ? "left-5" : "left-0.5"}`}/>
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditando(null)} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{backgroundColor: colorPrimario}}>
                {guardando ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
