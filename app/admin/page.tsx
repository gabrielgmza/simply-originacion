"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { Building2, Plus, LogOut, Loader2, FileText, DollarSign, AlertTriangle, Trash2, Settings, X, CheckCircle2, Percent } from "lucide-react";

const COLOR = "#FF5E14";
const fmt = (n: number) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;
interface Entidad { id: string; razonSocial: string; nombreFantasia: string; cuit: string; comisiones?: any; [k: string]: any; }
interface KPI { totalOps: number; montoLiquidado: number; enMora: number; usuarios: number; sucursales: number; }
const defaultCom = { porOperacion: 0, porCliente: 0, porEmail: 0, porWhatsapp: 0, cuotaMensualFija: 0, habilitada: false };

export default function AdminPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [kpis, setKpis] = useState<Record<string, KPI>>({});
  const [cargando, setCargando] = useState(true);
  const [guardado, setGuardado] = useState("");
  const [modalEliminar, setModalEliminar] = useState<Entidad | null>(null);
  const [confirmNombre, setConfirmNombre] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [modalCom, setModalCom] = useState<Entidad | null>(null);
  const [com, setCom] = useState(defaultCom);
  const [guardandoCom, setGuardandoCom] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!userData || userData.rol !== "MASTER_PAYSUR") router.push("/login");
      else cargar();
    }
  }, [userData, loading]);

  const cargar = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(query(collection(db, "entidades"), orderBy("fechaCreacion", "desc")));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Entidad));
      setEntidades(data);
      const kpiMap: Record<string, KPI> = {};
      await Promise.all(data.map(async ent => {
        const [opsSnap, usersSnap, sucSnap] = await Promise.all([
          getDocs(query(collection(db, "operaciones"), where("entidadId", "==", ent.id))),
          getDocs(query(collection(db, "usuarios"), where("entidadId", "==", ent.id), where("activo", "==", true))),
          getDocs(query(collection(db, "sucursales"), where("entidadId", "==", ent.id))),
        ]);
        const ops = opsSnap.docs.map(d => d.data());
        kpiMap[ent.id] = {
          totalOps: ops.length,
          montoLiquidado: ops.filter(o => ["LIQUIDADO","FINALIZADO"].includes(o.estado)).reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0),
          enMora: ops.filter(o => o.estado === "EN_MORA").length,
          usuarios: usersSnap.size,
          sucursales: sucSnap.size,
        };
      }));
      setKpis(kpiMap);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const eliminarEntidad = async () => {
    if (!modalEliminar || confirmNombre !== modalEliminar.nombreFantasia) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/admin/entidades/${modalEliminar.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEntidades(prev => prev.filter(e => e.id !== modalEliminar.id));
      setModalEliminar(null); setConfirmNombre("");
      setGuardado("Entidad eliminada"); setTimeout(() => setGuardado(""), 3000);
    } catch { alert("Error al eliminar."); }
    finally { setEliminando(false); }
  };

  const guardarCom = async () => {
    if (!modalCom) return;
    setGuardandoCom(true);
    try {
      const res = await fetch(`/api/admin/entidades/${modalCom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comisiones: com }),
      });
      if (!res.ok) throw new Error();
      setEntidades(prev => prev.map(e => e.id === modalCom.id ? { ...e, comisiones: com } : e));
      setModalCom(null);
      setGuardado("Comisiones guardadas"); setTimeout(() => setGuardado(""), 3000);
    } catch { alert("Error al guardar."); }
    finally { setGuardandoCom(false); }
  };

  const cerrarSesion = async () => {
    await auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (cargando) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-gray-600" size={32}/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      {/* TOPBAR */}
      <div className="border-b border-gray-900 px-8 py-4 flex items-center justify-between sticky top-0 bg-[#050505] z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ backgroundColor: COLOR }}>P</div>
          <div><p className="font-black text-sm">Paysur · Super Admin</p><p className="text-[10px] text-gray-600">{userData?.email}</p></div>
        </div>
        <div className="flex items-center gap-3">
          {guardado && <span className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={13}/> {guardado}</span>}
          <button onClick={() => router.push("/admin/onboarding")} className="flex items-center gap-2 px-4 py-2 text-white font-bold rounded-xl text-sm" style={{ backgroundColor: COLOR }}><Plus size={14}/> Nueva entidad</button>
          <button onClick={cerrarSesion} className="text-gray-500 hover:text-white p-2 rounded-xl hover:bg-gray-900"><LogOut size={18}/></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Entidades",       valor: entidades.length,                                                              icon: <Building2 size={18}/>,     color: "text-white" },
            { label: "Ops totales",     valor: Object.values(kpis).reduce((a,k)=>a+k.totalOps,0),                            icon: <FileText size={18}/>,      color: "text-blue-400" },
            { label: "Monto liquidado", valor: fmt(Object.values(kpis).reduce((a,k)=>a+k.montoLiquidado,0)),                 icon: <DollarSign size={18}/>,    color: "text-green-400" },
            { label: "En mora",         valor: Object.values(kpis).reduce((a,k)=>a+k.enMora,0),                              icon: <AlertTriangle size={18}/>, color: "text-red-400" },
          ].map(k => (
            <div key={k.label} className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5">
              <div className={`${k.color} mb-2`}>{k.icon}</div>
              <p className="text-2xl font-black">{k.valor}</p>
              <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* ENTIDADES */}
        <div>
          <h2 className="text-lg font-black mb-4">Entidades ({entidades.length})</h2>
          <div className="space-y-3">
            {entidades.map(ent => {
              const kpi = kpis[ent.id] || { totalOps:0, montoLiquidado:0, enMora:0, usuarios:0, sucursales:0 };
              return (
                <div key={ent.id} className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black">{ent.nombreFantasia}</p>
                      {ent.comisiones?.habilitada && <span className="text-[10px] bg-orange-950/50 text-orange-400 border border-orange-900/50 px-2 py-0.5 rounded-full font-bold">Facturacion ON</span>}
                    </div>
                    <p className="text-xs text-gray-500">{ent.razonSocial} · CUIT {ent.cuit}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{kpi.totalOps} ops</span>
                      <span>{fmt(kpi.montoLiquidado)} liquidado</span>
                      <span>{kpi.usuarios} usuarios</span>
                      {kpi.enMora > 0 && <span className="text-red-400">{kpi.enMora} en mora</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => { setCom(ent.comisiones || defaultCom); setModalCom(ent); }}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 rounded-xl text-xs font-bold text-gray-300 transition-all">
                      <Percent size={14}/> Comisiones
                    </button>
                    <button onClick={() => router.push(`/admin/entidades/${ent.id}`)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 rounded-xl text-xs font-bold text-gray-300 transition-all">
                      <Settings size={14}/> Gestionar
                    </button>
                    <button onClick={() => { setModalEliminar(ent); setConfirmNombre(""); }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-950/40 hover:bg-red-950/70 rounded-xl text-xs font-bold text-red-400 transition-all">
                      <Trash2 size={14}/> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-red-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-red-400 flex items-center gap-2"><Trash2 size={18}/> Eliminar entidad</h3>
              <button onClick={() => setModalEliminar(null)} className="text-gray-600 hover:text-white"><X size={18}/></button>
            </div>
            <p className="text-sm text-gray-400 mb-2">Accion <strong className="text-red-400">irreversible</strong>. Se eliminaran todos los datos de <strong className="text-white">{modalEliminar.nombreFantasia}</strong>.</p>
            <p className="text-xs text-gray-500 mb-4">Escribi <strong className="text-white">{modalEliminar.nombreFantasia}</strong> para confirmar:</p>
            <input type="text" value={confirmNombre} onChange={e => setConfirmNombre(e.target.value)}
              placeholder={modalEliminar.nombreFantasia}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-red-700 mb-4"/>
            <button onClick={eliminarEntidad} disabled={confirmNombre !== modalEliminar.nombreFantasia || eliminando}
              className="w-full py-3 rounded-xl font-bold text-white bg-red-700 hover:bg-red-600 disabled:opacity-30 flex items-center justify-center gap-2">
              {eliminando ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
              {eliminando ? "Eliminando..." : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL COMISIONES */}
      {modalCom && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black flex items-center gap-2"><Percent size={18} style={{ color: COLOR }}/> Comisiones · {modalCom.nombreFantasia}</h3>
              <button onClick={() => setModalCom(null)} className="text-gray-600 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-gray-800">
                <div><p className="text-sm font-bold">Facturacion habilitada</p><p className="text-xs text-gray-500">Activa para que esta entidad sea cobrada</p></div>
                <button onClick={() => setCom(prev => ({ ...prev, habilitada: !prev.habilitada }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${com.habilitada ? "bg-orange-500" : "bg-gray-700"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${com.habilitada ? "left-7" : "left-1"}`}/>
                </button>
              </div>
              {[
                { key: "cuotaMensualFija", label: "Cuota mensual fija",     desc: "$ fijo por mes independiente del uso",           prefix: "$" },
                { key: "porOperacion",     label: "Comision por operacion", desc: "% sobre monto de cada credito liquidado",         prefix: "%" },
                { key: "porCliente",       label: "Por cliente activo",     desc: "$ por cliente con credito vigente al mes",        prefix: "$" },
                { key: "porEmail",         label: "Por email enviado",      desc: "$ por cada email enviado por el sistema",         prefix: "$" },
                { key: "porWhatsapp",      label: "Por mensaje WhatsApp",   desc: "$ por cada mensaje WA enviado",                   prefix: "$" },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-4 p-4 bg-black rounded-xl border border-gray-800">
                  <div className="flex-1"><p className="text-sm font-bold">{f.label}</p><p className="text-xs text-gray-500">{f.desc}</p></div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">{f.prefix}</span>
                    <input type="number" min="0" step="0.01" value={(com as any)[f.key]}
                      onChange={e => setCom(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                      className="w-24 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm text-right outline-none focus:border-orange-500"/>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={guardarCom} disabled={guardandoCom}
              className="w-full mt-6 py-3 rounded-xl font-bold text-white hover:opacity-90 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: COLOR }}>
              {guardandoCom ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
              {guardandoCom ? "Guardando..." : "Guardar comisiones"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
