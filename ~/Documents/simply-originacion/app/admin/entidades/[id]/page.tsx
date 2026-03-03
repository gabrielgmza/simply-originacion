"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Building2, Users, ArrowLeft, Loader2, CheckCircle2, X,
  Shield, BarChart3, Key, Save, RefreshCw, Percent,
  TrendingUp, Banknote, AlertTriangle, Building
} from "lucide-react";

const C = "#FF5E14";
const fmt = (n: number) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;

const MODULOS = [
  { key: "cuad",         label: "CUAD",         desc: "Creditos con descuento por haberes" },
  { key: "adelantos",    label: "Adelantos",    desc: "Adelantos de sueldo via Pagos 360" },
  { key: "privados",     label: "Privados",     desc: "Creditos personales" },
  { key: "fondeadores",  label: "Fondeadores",  desc: "Subasta entre fondeadores" },
  { key: "renovaciones", label: "Renovaciones", desc: "Renovacion de creditos activos" },
  { key: "pagos360",     label: "Pagos 360",    desc: "Cobro automatico via CBU" },
  { key: "email",        label: "Email",        desc: "Notificaciones por email" },
];

export default function AdminEntidadPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [tab, setTab] = useState<"stats"|"datos"|"modulos"|"usuarios"|"reset">("stats");
  const [entidad, setEntidad] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [ops, setOps] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  // Forms
  const [datos, setDatos] = useState({ razonSocial: "", nombreFantasia: "", cuit: "", emailContacto: "", telefonoContacto: "" });
  const [modulos, setModulos] = useState<Record<string, boolean>>({});
  const [resetEmail, setResetEmail] = useState("");
  const [resetPass, setResetPass] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!userData || userData.rol !== "MASTER_PAYSUR") router.push("/login");
      else cargar();
    }
  }, [userData, loading, id]);

  const cargar = async () => {
    setCargando(true);
    try {
      const [entSnap, usersSnap, opsSnap] = await Promise.all([
        getDocs(query(collection(db, "entidades"), where("__name__", "==", id))),
        getDocs(query(collection(db, "usuarios"), where("entidadId", "==", id))),
        getDocs(query(collection(db, "operaciones"), where("entidadId", "==", id))),
      ]);
      if (entSnap.empty) { router.push("/admin"); return; }
      const ent = { id, ...entSnap.docs[0].data() };
      setEntidad(ent);
      setDatos({
        razonSocial:       ent.razonSocial || "",
        nombreFantasia:    ent.nombreFantasia || "",
        cuit:              ent.cuit || "",
        emailContacto:     ent.contacto?.email || "",
        telefonoContacto:  ent.contacto?.telefono || "",
      });
      setModulos(ent.modulosHabilitados || {});
      setUsuarios(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setOps(opsSnap.docs.map(d => d.data()));
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const guardarDatos = async () => {
    setGuardando(true);
    try {
      await fetch(`/api/admin/entidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datos }),
      });
      showMsg("Datos guardados");
    } catch { alert("Error al guardar"); }
    finally { setGuardando(false); }
  };

  const guardarModulos = async () => {
    setGuardando(true);
    try {
      await fetch(`/api/admin/entidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulosHabilitados: modulos }),
      });
      showMsg("Modulos actualizados");
    } catch { alert("Error al guardar"); }
    finally { setGuardando(false); }
  };

  const resetearClave = async () => {
    if (!resetEmail || resetPass.length < 6) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/entidades/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, password: resetPass }),
      });
      if (!res.ok) throw new Error();
      showMsg("Contrasena actualizada");
      setResetPass("");
    } catch { alert("Error al resetear"); }
    finally { setGuardando(false); }
  };

  if (cargando) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-gray-600" size={32}/></div>;
  if (!entidad) return null;

  const liquidadas  = ops.filter(o => ["LIQUIDADO","FINALIZADO","EN_MORA"].includes(o.estado));
  const enMora      = ops.filter(o => o.estado === "EN_MORA");
  const montoTotal  = liquidadas.reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0);
  const moraPorc    = liquidadas.length ? Math.round(enMora.length / liquidadas.length * 100) : 0;

  const TABS = [
    { key: "stats",    label: "Estadisticas", icon: <BarChart3 size={15}/> },
    { key: "datos",    label: "Datos",        icon: <Building2 size={15}/> },
    { key: "modulos",  label: "Modulos",      icon: <Shield size={15}/> },
    { key: "usuarios", label: "Usuarios",     icon: <Users size={15}/> },
    { key: "reset",    label: "Reset clave",  icon: <Key size={15}/> },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* TOPBAR */}
      <div className="border-b border-gray-900 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#050505] z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")} className="text-gray-500 hover:text-white p-2 rounded-xl hover:bg-gray-900"><ArrowLeft size={18}/></button>
          <div>
            <p className="font-black">{entidad.nombreFantasia}</p>
            <p className="text-xs text-gray-500">{entidad.razonSocial} · {entidad.cuit}</p>
          </div>
        </div>
        {msg && <span className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={13}/> {msg}</span>}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* TABS */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.key ? "text-white" : "text-gray-500 hover:text-gray-300 bg-gray-900"}`}
              style={tab === t.key ? { backgroundColor: C } : {}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ESTADISTICAS */}
        {tab === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Operaciones",     valor: ops.length,           icon: <TrendingUp size={18}/>,    color: "text-blue-400" },
                { label: "Monto cartera",   valor: fmt(montoTotal),      icon: <Banknote size={18}/>,      color: "text-green-400" },
                { label: "En mora",         valor: `${enMora.length} (${moraPorc}%)`, icon: <AlertTriangle size={18}/>, color: enMora.length > 0 ? "text-red-400" : "text-gray-500" },
                { label: "Usuarios activos",valor: usuarios.filter(u => u.activo).length, icon: <Users size={18}/>, color: "text-white" },
              ].map(k => (
                <div key={k.label} className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5">
                  <div className={`${k.color} mb-2`}>{k.icon}</div>
                  <p className="text-2xl font-black">{k.valor}</p>
                  <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5">
              <p className="text-sm font-black mb-3">Distribucion por estado</p>
              <div className="space-y-2">
                {["PENDIENTE","EN_REVISION","APROBADO","LIQUIDADO","EN_MORA","FINALIZADO","RECHAZADO"].map(estado => {
                  const count = ops.filter(o => o.estado === estado).length;
                  const porc  = ops.length ? Math.round(count / ops.length * 100) : 0;
                  if (count === 0) return null;
                  return (
                    <div key={estado} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-28">{estado}</span>
                      <div className="flex-1 bg-gray-900 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${porc}%`, backgroundColor: C }}/>
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* DATOS */}
        {tab === "datos" && (
          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-6 space-y-4">
            {[
              { key: "razonSocial",      label: "Razon social" },
              { key: "nombreFantasia",   label: "Nombre fantasia" },
              { key: "cuit",             label: "CUIT" },
              { key: "emailContacto",    label: "Email contacto" },
              { key: "telefonoContacto", label: "Telefono" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">{f.label}</label>
                <input value={(datos as any)[f.key]} onChange={e => setDatos(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500"/>
              </div>
            ))}
            <button onClick={guardarDatos} disabled={guardando}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: C }}>
              {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Guardar cambios
            </button>
          </div>
        )}

        {/* MODULOS */}
        {tab === "modulos" && (
          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-6 space-y-4">
            {MODULOS.map(m => (
              <div key={m.key} className="flex items-center justify-between p-3 bg-black rounded-xl border border-gray-800">
                <div>
                  <p className="text-sm font-bold">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </div>
                <button onClick={() => setModulos(p => ({ ...p, [m.key]: !p[m.key] }))}
                  className={`w-11 h-6 rounded-full transition-all relative ${modulos[m.key] ? "bg-orange-500" : "bg-gray-700"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${modulos[m.key] ? "left-6" : "left-1"}`}/>
                </button>
              </div>
            ))}
            <button onClick={guardarModulos} disabled={guardando}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: C }}>
              {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Guardar modulos
            </button>
          </div>
        )}

        {/* USUARIOS */}
        {tab === "usuarios" && (
          <div className="space-y-3">
            {usuarios.length === 0 && <p className="text-gray-500 text-sm">No hay usuarios.</p>}
            {usuarios.map(u => (
              <div key={u.id} className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{u.nombre || u.email}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                  <p className="text-[10px] text-gray-600 uppercase mt-0.5">{u.rol}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.activo
                    ? <span className="text-[10px] bg-green-900/30 text-green-400 border border-green-900/50 px-2 py-0.5 rounded-full font-bold">Activo</span>
                    : <span className="text-[10px] bg-red-900/30 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full font-bold">Inactivo</span>
                  }
                  <button onClick={() => { setTab("reset"); setResetEmail(u.email); }}
                    className="p-2 text-gray-500 hover:text-white bg-gray-900 rounded-lg">
                    <Key size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RESET CLAVE */}
        {tab === "reset" && (
          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Key size={16} style={{ color: C }}/>
              <p className="font-black">Resetear contrasena</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Email del usuario</label>
              <input value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="usuario@entidad.com"
                className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Nueva contrasena</label>
              <input type="password" value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="Minimo 6 caracteres"
                className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500"/>
            </div>
            <button onClick={resetearClave} disabled={guardando || !resetEmail || resetPass.length < 6}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-30" style={{ backgroundColor: C }}>
              {guardando ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} Actualizar contrasena
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
