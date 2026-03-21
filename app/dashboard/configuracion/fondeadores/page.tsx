"use client";
// app/dashboard/configuracion/fondeadores/page.tsx
import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, serverTimestamp, deleteDoc, getDoc
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  initializeApp, getApps, getApp
} from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signOut
} from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { PERMISOS_DEFAULT, type PortalPermisos } from "@/lib/fondeo/subasta-motor";
import {
  Plus, Save, Loader2, CheckCircle2, Trash2,
  Settings, ChevronDown, ChevronUp, Eye, EyeOff,
  Landmark, Percent, DollarSign, X, ExternalLink
} from "lucide-react";

const SECCIONES: { key: keyof PortalPermisos; label: string; desc: string }[] = [
  { key: "verCartera",       label: "Resumen de cartera",       desc: "KPIs: capital, mora, cobrado" },
  { key: "verLegajos",       label: "Legajos del cliente",      desc: "DNI, selfie, firma, datos personales" },
  { key: "verPlanCuotas",    label: "Plan de cuotas y pagos",   desc: "Estado de cada cuota y pagos recibidos" },
  { key: "verEstadisticas",  label: "Estadísticas y gráficos",  desc: "Tendencia mensual de su cartera" },
  { key: "verHistorial",     label: "Historial de operaciones", desc: "Lista completa de ops asignadas" },
  { key: "verContabilidad",  label: "Contabilidad",             desc: "Capital, interés devengado, pendiente" },
  { key: "exportarExcel",    label: "Exportar Excel",           desc: "Descarga de su cartera en planilla" },
];

export default function ConfigFondeadoresPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [fondeadores, setFondeadores] = useState<any[]>([]);
  const [cargando,    setCargando]    = useState(true);
  const [expandido,   setExpandido]   = useState<string | null>(null);
  const [modalNuevo,  setModalNuevo]  = useState(false);
  const [guardando,   setGuardando]   = useState(false);
  const [ok,          setOk]          = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "", email: "", password: "",
    tnaPropia: 80, plazoMaximo: 24,
    montoMinimo: 10000, montoMaximo: 5000000,
    scoringMinimo: 0,
    cupoMaximo: 50000000,
    comisionTipo: "PORCENTUAL", comisionValor: 2,
    emailNotificacion: "",
    productos: ["CUAD", "PRIVADO", "ADELANTO"],
  });

  const puedeEditar = ["GERENTE_GENERAL","MASTER_PAYSUR"].includes(userData?.rol || "");

  const cargar = async () => {
    if (!entidadData?.id) return;
    setCargando(true);
    const snap = await getDocs(
      query(collection(db, "fondeadores"), where("entidadId", "==", entidadData.id))
    );
    setFondeadores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setCargando(false);
  };
  useEffect(() => { cargar(); }, [entidadData]);

  // Crear fondeador + usuario Firebase Auth
  const crear = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      // Crear usuario en Firebase Auth con app secundaria
      const firebaseConfig = {
        apiKey:    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      const apps = getApps();
      const secondary = apps.find(a => a.name === "SecondaryApp")
        || initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondary);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      await signOut(secondaryAuth);

      // Crear doc fondeador
      const fondRef = await addDoc(collection(db, "fondeadores"), {
        entidadId:        entidadData.id,
        uid:              cred.user.uid,
        nombre:           form.nombre,
        email:            form.email,
        activo:           true,
        tnaPropia:        form.tnaPropia,
        plazoMaximo:      form.plazoMaximo,
        montoMinimo:      form.montoMinimo,
        montoMaximo:      form.montoMaximo,
        scoringMinimo:    form.scoringMinimo,
        cupoMaximo:       form.cupoMaximo,
        cupoUsado:        0,
        comision:         { tipo: form.comisionTipo, valor: form.comisionValor },
        emailNotificacion:form.emailNotificacion || form.email,
        portalPermisos:   { ...PERMISOS_DEFAULT },
        fechaCreacion:    serverTimestamp(),
      });

      // Guardar en colección usuarios para auth
      await addDoc(collection(db, "usuarios"), {
        uid:        cred.user.uid,
        email:      form.email,
        nombre:     form.nombre,
        rol:        "FONDEADOR",
        entidadId:  entidadData.id,
        fondeadorId:fondRef.id,
        activo:     true,
        fechaCreacion: serverTimestamp(),
      });

      setModalNuevo(false);
      setForm({ nombre:"",email:"",password:"",tnaPropia:80,plazoMaximo:24,montoMinimo:10000,montoMaximo:5000000,scoringMinimo:0,cupoMaximo:50000000,comisionTipo:"PORCENTUAL",comisionValor:2,emailNotificacion:"" });
      cargar();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally { setGuardando(false); }
  };

  // Guardar permisos de un fondeador
  const guardarPermisos = async (f: any, permisos: PortalPermisos) => {
    setGuardando(true);
    try {
      await updateDoc(doc(db, "fondeadores", f.id), { portalPermisos: permisos });
      setOk(f.id); setTimeout(() => setOk(null), 2500);
      cargar();
    } finally { setGuardando(false); }
  };

  // Guardar parámetros financieros
  const guardarParams = async (f: any) => {
    setGuardando(true);
    try {
      await updateDoc(doc(db, "fondeadores", f.id), {
        tnaPropia:     f.tnaPropia,
        plazoMaximo:   f.plazoMaximo,
        montoMinimo:   f.montoMinimo,
        montoMaximo:   f.montoMaximo,
        scoringMinimo: f.scoringMinimo,
        cupoMaximo:    f.cupoMaximo,
        comision:      f.comision,
        activo:        f.activo,
        emailNotificacion: f.emailNotificacion,
        productos: f.productos || [],
      });
      setOk(f.id + "_params"); setTimeout(() => setOk(null), 2500);
    } finally { setGuardando(false); }
  };

  const setFondProp = (id: string, key: string, value: any) =>
    setFondeadores(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));

  const setPermiso = (id: string, key: keyof PortalPermisos, value: boolean) =>
    setFondeadores(prev => prev.map(f =>
      f.id === id ? { ...f, portalPermisos: { ...(f.portalPermisos || PERMISOS_DEFAULT), [key]: value } } : f
    ));

  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);

  if (cargando) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={24}/></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Fondeadores</h1>
          <p className="text-gray-500 text-sm mt-0.5">{fondeadores.length} registrados</p>
        </div>
        {puedeEditar && (
          <button onClick={() => setModalNuevo(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: colorPrimario }}>
            <Plus size={14}/> Nuevo fondeador
          </button>
        )}
      </div>

      {/* Lista */}
      {fondeadores.length === 0 && (
        <div className="bg-[#0A0A0A] border border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-600">
          No hay fondeadores registrados.
        </div>
      )}

      {fondeadores.map(f => (
        <div key={f.id} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">

          {/* Cabecera fondeador */}
          <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 transition-all"
            onClick={() => setExpandido(expandido === f.id ? null : f.id)}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: colorPrimario + "33" }}>
              <Landmark size={16} style={{ color: colorPrimario }}/>
            </div>
            <div className="flex-1">
              <p className="font-black text-white">{f.nombre}</p>
              <p className="text-xs text-gray-500">TNA {f.tnaPropia}% · Plazo {f.plazoMaximo}q · Cupo ${fmt(f.cupoMaximo)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.activo ? "text-green-400 bg-green-900/20" : "text-red-400 bg-red-900/20"}`}>
                {f.activo ? "Activo" : "Inactivo"}
              </span>
              <a href={`/fondeador`} target="_blank" title="Ver portal"
                onClick={e => e.stopPropagation()}
                className="text-gray-600 hover:text-blue-400 transition-colors">
                <ExternalLink size={13}/>
              </a>
              {expandido === f.id ? <ChevronUp size={15} className="text-gray-500"/> : <ChevronDown size={15} className="text-gray-500"/>}
            </div>
          </div>

          {expandido === f.id && (
            <div className="border-t border-gray-800 p-5 space-y-6">

              {/* Parámetros financieros */}
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Parámetros financieros</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "TNA (%)",        key: "tnaPropia",     type: "number", step: 0.5  },
                    { label: "Plazo máx (q)",  key: "plazoMaximo",   type: "number", step: 1    },
                    { label: "Monto mín ($)",  key: "montoMinimo",   type: "number", step: 1000 },
                    { label: "Monto máx ($)",  key: "montoMaximo",   type: "number", step: 10000},
                    { label: "Score mín",      key: "scoringMinimo", type: "number", step: 50   },
                    { label: "Cupo máx ($)",   key: "cupoMaximo",    type: "number", step: 100000},
                  ].map(p => (
                    <div key={p.key}>
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">{p.label}</label>
                      <input type={p.type} step={p.step} value={(f as any)[p.key]}
                        onChange={e => setFondProp(f.id, p.key, parseFloat(e.target.value) || 0)}
                        disabled={!puedeEditar}
                        className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50"/>
                    </div>
                  ))}
                </div>

                {/* Comisión */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Tipo comisión</label>
                    <select value={f.comision?.tipo || "PORCENTUAL"}
                      onChange={e => setFondProp(f.id, "comision", { ...f.comision, tipo: e.target.value })}
                      disabled={!puedeEditar}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50">
                      <option value="PORCENTUAL">Porcentual %</option>
                      <option value="FIJA">Fija $</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">
                      Valor ({f.comision?.tipo === "FIJA" ? "$" : "%"})
                    </label>
                    <input type="number" step={f.comision?.tipo === "FIJA" ? 100 : 0.1}
                      value={f.comision?.valor || 0}
                      onChange={e => setFondProp(f.id, "comision", { ...f.comision, valor: parseFloat(e.target.value) || 0 })}
                      disabled={!puedeEditar}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50"/>
                  </div>
                </div>

                {/* Email + activo */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Email notificación</label>
                    <input type="email" value={f.emailNotificacion || ""}
                      onChange={e => setFondProp(f.id, "emailNotificacion", e.target.value)}
                      disabled={!puedeEditar}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50"/>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button onClick={() => puedeEditar && setFondProp(f.id, "activo", !f.activo)}
                        className="w-10 h-5 rounded-full relative transition-all"
                        style={{ backgroundColor: f.activo ? colorPrimario : "#374151" }}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${f.activo ? "left-5" : "left-0.5"}`}/>
                      </button>
                      <span className="text-sm text-white font-bold">Activo</span>
                    </label>
                  </div>
                </div>

                {puedeEditar && (
                  <button onClick={() => guardarParams(f)} disabled={guardando}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                    style={{ backgroundColor: colorPrimario }}>
                    {ok === f.id + "_params" ? <CheckCircle2 size={13}/> : guardando ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
                    {ok === f.id + "_params" ? "Guardado" : "Guardar parámetros"}
                  </button>
                )}
              </div>

              {/* Productos habilitados */}
              <div className="mt-4">
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Productos habilitados</p>
                <div className="flex gap-2">
                  {["CUAD", "PRIVADO", "ADELANTO"].map(prod => {
                    const activo = (f.productos || []).includes(prod);
                    return (
                      <button key={prod} type="button"
                        onClick={() => {
                          const prods = f.productos || [];
                          const next = activo ? prods.filter((p: string) => p !== prod) : [...prods, prod];
                          setFondProp(f.id, "productos", next);
                        }}
                        disabled={!puedeEditar}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          activo ? "border-green-700 bg-green-900/30 text-green-400" : "border-gray-700 text-gray-500 hover:text-white"
                        } disabled:opacity-50`}>
                        {prod}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permisos del portal */}
              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Permisos del portal</p>
                <div className="space-y-3">
                  {SECCIONES.map(s => {
                    const permisos = f.portalPermisos || PERMISOS_DEFAULT;
                    const activo   = permisos[s.key] !== false;
                    return (
                      <div key={s.key} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">{s.label}</p>
                          <p className="text-[10px] text-gray-600">{s.desc}</p>
                        </div>
                        <button onClick={() => puedeEditar && setPermiso(f.id, s.key, !activo)}
                          disabled={!puedeEditar}
                          className="w-10 h-5 rounded-full relative transition-all shrink-0 mt-0.5 disabled:opacity-50"
                          style={{ backgroundColor: activo ? colorPrimario : "#374151" }}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${activo ? "left-5" : "left-0.5"}`}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {puedeEditar && (
                  <button onClick={() => guardarPermisos(f, f.portalPermisos || PERMISOS_DEFAULT)}
                    disabled={guardando}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                    style={{ backgroundColor: colorPrimario }}>
                    {ok === f.id ? <CheckCircle2 size={13}/> : guardando ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
                    {ok === f.id ? "Guardado" : "Guardar permisos"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Modal nuevo fondeador */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-gray-700 rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="font-black text-white text-lg">Nuevo fondeador</p>
              <button onClick={() => setModalNuevo(false)} className="text-gray-600 hover:text-white"><X size={18}/></button>
            </div>

            <div className="space-y-3">
              {[
                { label: "Nombre",              key: "nombre",       type: "text",     placeholder: "Ej: Inversora del Sur"   },
                { label: "Email (acceso portal)",key: "email",       type: "email",    placeholder: "fondeador@empresa.com"   },
                { label: "Contraseña inicial",  key: "password",     type: "password", placeholder: "mín. 6 caracteres"       },
                { label: "Email notificaciones",key: "emailNotificacion", type: "email", placeholder: "Igual al de acceso si no" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"/>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "TNA (%)",       key: "tnaPropia",     step: 0.5   },
                  { label: "Plazo máx (q)", key: "plazoMaximo",   step: 1     },
                  { label: "Monto mín ($)", key: "montoMinimo",   step: 1000  },
                  { label: "Monto máx ($)", key: "montoMaximo",   step: 10000 },
                  { label: "Score mín",     key: "scoringMinimo", step: 50    },
                  { label: "Cupo máx ($)",  key: "cupoMaximo",    step: 100000},
                ].map(p => (
                  <div key={p.key}>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">{p.label}</label>
                    <input type="number" step={p.step} value={(form as any)[p.key]}
                      onChange={e => setForm(prev => ({ ...prev, [p.key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"/>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Tipo comisión</label>
                  <select value={form.comisionTipo} onChange={e => setForm(p => ({ ...p, comisionTipo: e.target.value }))}
                    className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                    <option value="PORCENTUAL">Porcentual %</option>
                    <option value="FIJA">Fija $</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Valor comisión</label>
                  <input type="number" step={form.comisionTipo === "FIJA" ? 100 : 0.1}
                    value={form.comisionValor}
                    onChange={e => setForm(p => ({ ...p, comisionValor: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"/>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setModalNuevo(false)}
                className="py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">
                Cancelar
              </button>
              <button onClick={crear} disabled={guardando}
                className="py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: colorPrimario }}>
                {guardando ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
