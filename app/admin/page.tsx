"use client";
import { useEffect, useState } from "react";
import {
  collection, addDoc, getDocs, doc, setDoc, updateDoc,
  serverTimestamp, query, orderBy, where, getDoc
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, Users, Loader2, X, Save,
  ChevronRight, Power, Settings, Eye, Shield,
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2,
  ToggleLeft, ToggleRight, LogIn, FileText, MapPin
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Entidad {
  id: string;
  razonSocial: string;
  nombreFantasia: string;
  cuit: string;
  activa?: boolean;
  contacto: { email: string; telefono: string };
  configuracion: {
    colorPrimario: string;
    moduloAdelantos: boolean;
    moduloCuad: boolean;
    moduloPrivados: boolean;
    tasaInteresBase?: number;
    gastosOtorgamiento?: number;
    seguroVidaPorc?: number;
  };
  fechaCreacion: any;
}

interface KPIEntidad {
  totalOps: number;
  montoLiquidado: number;
  enMora: number;
  usuarios: number;
  sucursales: number;
}

const defaultEntidad = {
  razonSocial: "", nombreFantasia: "", cuit: "",
  emailContacto: "", telefonoContacto: "", colorPrimario: "#FF5E14"
};
const defaultGerente = { nombre: "", email: "", password: "" };

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  const [entidades, setEntidades]       = useState<Entidad[]>([]);
  const [kpis, setKpis]                 = useState<Record<string, KPIEntidad>>({});
  const [cargando, setCargando]         = useState(true);
  const [procesando, setProcesando]     = useState(false);
  const [guardado, setGuardado]         = useState("");

  // Modales
  const [modalEntidad, setModalEntidad]       = useState(false);
  const [modalGerente, setModalGerente]       = useState(false);
  const [modalDetalle, setModalDetalle]       = useState<Entidad | null>(null);
  const [modalModulos, setModalModulos]       = useState<Entidad | null>(null);

  // Forms
  const [formEntidad, setFormEntidad] = useState(defaultEntidad);
  const [formGerente, setFormGerente] = useState(defaultGerente);
  const [entidadParaGerente, setEntidadParaGerente] = useState<Entidad | null>(null);

  // Detalle
  const [detalleUsuarios, setDetalleUsuarios]     = useState<any[]>([]);
  const [detalleSucursales, setDetalleSucursales] = useState<any[]>([]);
  const [detalleOps, setDetalleOps]               = useState<any[]>([]);
  const [cargandoDetalle, setCargandoDetalle]     = useState(false);

  const COLOR = "#FF5E14";

  // ── Auth guard ──
  useEffect(() => {
    if (!loading) {
      if (!userData || userData.rol !== "MASTER_PAYSUR") router.push("/login");
      else cargar();
    }
  }, [userData, loading]);

  // ── Cargar entidades + KPIs ──
  const cargar = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(query(collection(db, "entidades"), orderBy("fechaCreacion", "desc")));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Entidad));
      setEntidades(data);

      const kpiMap: Record<string, KPIEntidad> = {};
      await Promise.all(data.map(async ent => {
        const [opsSnap, usersSnap, sucSnap] = await Promise.all([
          getDocs(query(collection(db, "operaciones"), where("entidadId", "==", ent.id))),
          getDocs(query(collection(db, "usuarios"), where("entidadId", "==", ent.id), where("activo", "==", true))),
          getDocs(query(collection(db, "sucursales"), where("entidadId", "==", ent.id))),
        ]);
        const ops = opsSnap.docs.map(d => d.data());
        kpiMap[ent.id] = {
          totalOps:       ops.length,
          montoLiquidado: ops.filter(o => ["LIQUIDADO","FINALIZADO"].includes(o.estado)).reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0),
          enMora:         ops.filter(o => o.estado === "EN_MORA").length,
          usuarios:       usersSnap.size,
          sucursales:     sucSnap.size,
        };
      }));
      setKpis(kpiMap);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  // ── Crear entidad ──
  const crearEntidad = async () => {
    if (!formEntidad.razonSocial || !formEntidad.cuit) { alert("Razón social y CUIT son obligatorios."); return; }
    setProcesando(true);
    try {
      await addDoc(collection(db, "entidades"), {
        razonSocial:    formEntidad.razonSocial,
        nombreFantasia: formEntidad.nombreFantasia || formEntidad.razonSocial,
        cuit:           formEntidad.cuit,
        activa:         true,
        contacto: { email: formEntidad.emailContacto, telefono: formEntidad.telefonoContacto },
        configuracion: {
          colorPrimario:    formEntidad.colorPrimario,
          moduloAdelantos:  true,
          moduloCuad:       true,
          moduloPrivados:   true,
          tasaInteresBase:  0,
          gastosOtorgamiento: 0,
          seguroVidaPorc:   0,
        },
        fechaCreacion: serverTimestamp(),
      });
      setModalEntidad(false);
      setFormEntidad(defaultEntidad);
      ok("Entidad creada");
      cargar();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setProcesando(false); }
  };

  // ── Crear gerente ──
  const crearGerente = async () => {
    if (!entidadParaGerente || !formGerente.nombre || !formGerente.email || !formGerente.password) {
      alert("Completá todos los campos."); return;
    }
    setProcesando(true);
    try {
      const firebaseConfig = {
        apiKey:     process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId:  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      const apps = getApps();
      const secondaryApp = apps.find(a => a.name === "SecondaryApp") || initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, formGerente.email, formGerente.password);

      await setDoc(doc(db, "usuarios", cred.user.uid), {
        uid:       cred.user.uid,
        email:     formGerente.email,
        nombre:    formGerente.nombre,
        rol:       "GERENTE_GENERAL",
        entidadId: entidadParaGerente.id,
        activo:    true,
        fechaCreacion: serverTimestamp(),
      });
      await signOut(secondaryAuth);

      setModalGerente(false);
      setFormGerente(defaultGerente);
      ok("Gerente creado");
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setProcesando(false); }
  };

  // ── Activar/desactivar entidad ──
  const toggleActiva = async (ent: Entidad) => {
    await updateDoc(doc(db, "entidades", ent.id), { activa: !ent.activa });
    cargar();
  };

  // ── Guardar módulos ──
  const guardarModulos = async (ent: Entidad, modulos: any) => {
    setProcesando(true);
    try {
      await updateDoc(doc(db, "entidades", ent.id), {
        "configuracion.moduloAdelantos": modulos.moduloAdelantos,
        "configuracion.moduloCuad":      modulos.moduloCuad,
        "configuracion.moduloPrivados":  modulos.moduloPrivados,
      });
      setModalModulos(null);
      ok("Módulos actualizados");
      cargar();
    } finally { setProcesando(false); }
  };

  // ── Cargar detalle de entidad ──
  const verDetalle = async (ent: Entidad) => {
    setModalDetalle(ent);
    setCargandoDetalle(true);
    try {
      const [usersSnap, sucSnap, opsSnap] = await Promise.all([
        getDocs(query(collection(db, "usuarios"), where("entidadId", "==", ent.id))),
        getDocs(query(collection(db, "sucursales"), where("entidadId", "==", ent.id))),
        getDocs(query(collection(db, "operaciones"), where("entidadId", "==", ent.id), orderBy("fechaCreacion", "desc"))),
      ]);
      setDetalleUsuarios(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDetalleSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDetalleOps(opsSnap.docs.slice(0, 10).map(d => ({ id: d.id, ...d.data() })));
    } finally { setCargandoDetalle(false); }
  };

  // ── Impersonar entidad ──
  const impersonar = (ent: Entidad) => {
    sessionStorage.setItem("impersonando_entidadId",    ent.id);
    sessionStorage.setItem("impersonando_nombreFantasia", ent.nombreFantasia);
    router.push("/dashboard");
  };

  const ok = (msg: string) => { setGuardado(msg); setTimeout(() => setGuardado(""), 2500); };

  const fmt = (n: number) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;

  // ── KPIs globales ──
  const totalOpsGlobal    = Object.values(kpis).reduce((a, k) => a + k.totalOps, 0);
  const totalMontoGlobal  = Object.values(kpis).reduce((a, k) => a + k.montoLiquidado, 0);
  const totalMoraGlobal   = Object.values(kpis).reduce((a, k) => a + k.enMora, 0);
  const totalUsuarios     = Object.values(kpis).reduce((a, k) => a + k.usuarios, 0);

  if (cargando) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-600" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      {/* TOPBAR */}
      <div className="border-b border-gray-900 px-8 py-4 flex items-center justify-between sticky top-0 bg-[#050505] z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ backgroundColor: COLOR }}>P</div>
          <div>
            <p className="font-black text-sm">Paysur · Super Admin</p>
            <p className="text-[10px] text-gray-600">{userData?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {guardado && <span className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={13}/>{guardado}</span>}
          <button onClick={() => { setModalEntidad(true); setFormEntidad(defaultEntidad); }}
            className="flex items-center gap-2 px-4 py-2 text-white font-bold rounded-xl text-sm"
            style={{ backgroundColor: COLOR }}>
            <Plus size={14}/> Nueva entidad
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* KPIs GLOBALES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Entidades",       valor: entidades.length,         icon: <Building2 size={18}/>, color: "text-white" },
            { label: "Ops totales",      valor: totalOpsGlobal,           icon: <FileText size={18}/>,  color: "text-blue-400" },
            { label: "Monto liquidado",  valor: fmt(totalMontoGlobal),    icon: <DollarSign size={18}/>,color: "text-green-400" },
            { label: "En mora",          valor: totalMoraGlobal,          icon: <AlertTriangle size={18}/>, color: totalMoraGlobal > 0 ? "text-red-400" : "text-gray-600" },
          ].map((k, i) => (
            <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
              <div className={`mb-2 ${k.color}`}>{k.icon}</div>
              <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* LISTA ENTIDADES */}
        <div className="space-y-3">
          {entidades.map(ent => {
            const kpi = kpis[ent.id] || { totalOps: 0, montoLiquidado: 0, enMora: 0, usuarios: 0, sucursales: 0 };
            const activa = ent.activa !== false;
            return (
              <div key={ent.id} className={`bg-[#0A0A0A] border rounded-2xl p-5 transition-all ${!activa ? "opacity-50 border-gray-900" : "border-gray-800"}`}>
                <div className="flex items-center gap-4">

                  {/* Color dot */}
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ent.configuracion?.colorPrimario || COLOR }} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{ent.nombreFantasia}</p>
                      <span className="text-[10px] text-gray-500 font-mono">{ent.cuit}</span>
                      {!activa && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">Inactiva</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{ent.razonSocial}</p>
                  </div>

                  {/* KPIs inline */}
                  <div className="hidden md:flex items-center gap-6 text-center">
                    {[
                      { v: kpi.totalOps,    l: "Ops",      c: "text-white" },
                      { v: fmt(kpi.montoLiquidado), l: "Liquidado", c: "text-green-400" },
                      { v: kpi.enMora,      l: "Mora",     c: kpi.enMora > 0 ? "text-red-400" : "text-gray-600" },
                      { v: kpi.usuarios,    l: "Usuarios", c: "text-blue-400" },
                      { v: kpi.sucursales,  l: "Sucursales",c: "text-gray-400" },
                    ].map((k, i) => (
                      <div key={i}>
                        <p className={`font-black text-sm ${k.c}`}>{k.v}</p>
                        <p className="text-[9px] text-gray-600 uppercase">{k.l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => verDetalle(ent)} title="Ver detalle"
                      className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                      <Eye size={15}/>
                    </button>
                    <button onClick={() => setModalModulos(ent)} title="Módulos"
                      className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                      <Settings size={15}/>
                    </button>
                    <button onClick={() => { setEntidadParaGerente(ent); setFormGerente(defaultGerente); setModalGerente(true); }} title="Crear gerente"
                      className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                      <Users size={15}/>
                    </button>
                    <button onClick={() => impersonar(ent)} title="Impersonar"
                      className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all">
                      <LogIn size={15}/>
                    </button>
                    <button onClick={() => toggleActiva(ent)} title={activa ? "Desactivar" : "Activar"}
                      className={`p-2 rounded-lg transition-all ${activa ? "text-green-400 hover:bg-red-900/20 hover:text-red-400" : "text-gray-600 hover:text-green-400 hover:bg-green-900/20"}`}>
                      <Power size={15}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL NUEVA ENTIDAD ── */}
      {modalEntidad && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-white text-lg">Nueva Entidad</h2>
              <button onClick={() => setModalEntidad(false)}><X size={18} className="text-gray-500"/></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Razón Social *",    key: "razonSocial",      col: "col-span-2" },
                { label: "Nombre Fantasía",   key: "nombreFantasia",   col: "col-span-2" },
                { label: "CUIT *",            key: "cuit",             col: "" },
                { label: "Email contacto",    key: "emailContacto",    col: "" },
                { label: "Teléfono",          key: "telefonoContacto", col: "" },
              ].map(f => (
                <div key={f.key} className={f.col}>
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-1.5">{f.label}</label>
                  <input value={(formEntidad as any)[f.key]}
                    onChange={e => setFormEntidad(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"/>
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1.5">Color primario</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={formEntidad.colorPrimario}
                    onChange={e => setFormEntidad(p => ({ ...p, colorPrimario: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"/>
                  <span className="text-sm text-gray-400 font-mono">{formEntidad.colorPrimario}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalEntidad(false)} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">Cancelar</button>
              <button onClick={crearEntidad} disabled={procesando}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: COLOR }}>
                {procesando ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR GERENTE ── */}
      {modalGerente && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black text-white">Crear Gerente General</h2>
              <button onClick={() => setModalGerente(false)}><X size={18} className="text-gray-500"/></button>
            </div>
            <p className="text-xs text-gray-500 mb-5">Para: <span className="font-bold" style={{ color: COLOR }}>{entidadParaGerente?.nombreFantasia}</span></p>
            <div className="space-y-4">
              {[
                { label: "Nombre completo *", key: "nombre",   type: "text" },
                { label: "Email *",           key: "email",    type: "email" },
                { label: "Contraseña *",      key: "password", type: "password" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-1.5">{f.label}</label>
                  <input type={f.type} value={(formGerente as any)[f.key]}
                    onChange={e => setFormGerente(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"/>
                </div>
              ))}
              <p className="text-[10px] text-gray-600">La contraseña debe tener al menos 6 caracteres.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalGerente(false)} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">Cancelar</button>
              <button onClick={crearGerente} disabled={procesando}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: COLOR }}>
                {procesando ? <Loader2 size={15} className="animate-spin"/> : <Users size={15}/>} Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MÓDULOS ── */}
      {modalModulos && <ModulosModal ent={modalModulos} onClose={() => setModalModulos(null)} onSave={guardarModulos} procesando={procesando} />}

      {/* ── MODAL DETALLE ── */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-[#0A0A0A]">
              <div>
                <h2 className="font-black text-white">{modalDetalle.nombreFantasia}</h2>
                <p className="text-xs text-gray-500">CUIT {modalDetalle.cuit}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => impersonar(modalDetalle)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-all">
                  <LogIn size={13}/> Impersonar
                </button>
                <button onClick={() => setModalDetalle(null)}><X size={18} className="text-gray-500"/></button>
              </div>
            </div>

            {cargandoDetalle ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-600" size={24}/></div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Usuarios */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Usuarios ({detalleUsuarios.length})</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {detalleUsuarios.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-2">
                        <div>
                          <p className="text-sm font-bold text-white">{u.nombre}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-gray-800 text-gray-400">{u.rol?.replace(/_/g," ")}</span>
                      </div>
                    ))}
                    {detalleUsuarios.length === 0 && <p className="text-xs text-gray-600 text-center py-4">Sin usuarios</p>}
                  </div>
                </div>

                {/* Sucursales */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Sucursales ({detalleSucursales.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {detalleSucursales.map(s => (
                      <span key={s.id} className="flex items-center gap-1 text-xs bg-gray-800 px-3 py-1.5 rounded-lg text-gray-300">
                        <MapPin size={11}/>{s.nombre}
                      </span>
                    ))}
                    {detalleSucursales.length === 0 && <p className="text-xs text-gray-600">Sin sucursales</p>}
                  </div>
                </div>

                {/* Últimas operaciones */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Últimas 10 operaciones</p>
                  <div className="space-y-1.5">
                    {detalleOps.map(o => (
                      <div key={o.id} className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-2">
                        <div>
                          <p className="text-sm font-bold text-white">{o.cliente?.nombre}</p>
                          <p className="text-xs text-gray-500">${(o.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                          o.estado === "LIQUIDADO" ? "bg-green-900/30 text-green-400" :
                          o.estado === "EN_MORA"   ? "bg-red-900/30 text-red-400" :
                          "bg-gray-800 text-gray-400"}`}>{o.estado}</span>
                      </div>
                    ))}
                    {detalleOps.length === 0 && <p className="text-xs text-gray-600 text-center py-4">Sin operaciones</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MODAL MÓDULOS (componente separado) ────────────────────────────────────────
function ModulosModal({ ent, onClose, onSave, procesando }: {
  ent: Entidad;
  onClose: () => void;
  onSave: (ent: Entidad, modulos: any) => void;
  procesando: boolean;
}) {
  const [modulos, setModulos] = useState({
    moduloAdelantos: ent.configuracion?.moduloAdelantos ?? true,
    moduloCuad:      ent.configuracion?.moduloCuad ?? true,
    moduloPrivados:  ent.configuracion?.moduloPrivados ?? true,
  });

  const ITEMS = [
    { key: "moduloCuad",      label: "CUAD",              desc: "Créditos con descuento de haberes (gobierno)" },
    { key: "moduloAdelantos", label: "Adelantos salariales",desc: "Anticipos vía Pagos 360" },
    { key: "moduloPrivados",  label: "Préstamos privados", desc: "Créditos personales sin descuento" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-black text-white">Módulos habilitados</h2>
          <button onClick={onClose}><X size={18} className="text-gray-500"/></button>
        </div>
        <p className="text-xs text-gray-500 mb-5">{ent.nombreFantasia}</p>
        <div className="space-y-3">
          {ITEMS.map(item => (
            <div key={item.key} className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button onClick={() => setModulos(p => ({ ...p, [item.key]: !(p as any)[item.key] }))}>
                {(modulos as any)[item.key]
                  ? <ToggleRight size={28} className="text-green-400"/>
                  : <ToggleLeft  size={28} className="text-gray-600"/>}
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">Cancelar</button>
          <button onClick={() => onSave(ent, modulos)} disabled={procesando}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 bg-orange-600">
            {procesando ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
