"use client";
// app/setup/entidad/page.tsx
// Wizard de setup que completa la entidad luego de ser creada por MASTER_PAYSUR
// Protegido: solo GERENTE_GENERAL con setupCompletado = false

import { useState, useEffect, Suspense } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2, ChevronRight, Loader2, Save,
  Percent, MessageSquare, Key, CreditCard,
  Lock, Building2, Rocket, AlertTriangle
} from "lucide-react";

const PASOS = [
  { id: 1, label: "Tasas",      icon: Percent      },
  { id: 2, label: "WhatsApp",   icon: MessageSquare },
  { id: 3, label: "CUAD",       icon: Key           },
  { id: 4, label: "Pagos 360",  icon: CreditCard    },
  { id: 5, label: "Seguridad",  icon: Lock          },
  { id: 6, label: "Sucursal",   icon: Building2     },
];

function SetupWizard() {
  const { entidadData, userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entidadId = searchParams.get("entidadId") || entidadData?.id || "";

  const colorPrimario = "#FF5E14";
  const [pasoActual,  setPasoActual]  = useState(1);
  const [guardando,   setGuardando]   = useState(false);
  const [completado,  setCompletado]  = useState(false);
  const [modulos,     setModulos]     = useState<any>({});
  const [errores,     setErrores]     = useState<Record<string,string>>({});

  // Datos por paso
  const [tasas, setTasas] = useState({
    tasaInteresBase: "", gastosOtorgamiento: "", seguroVidaPorc: "", tasaMoratoria: "0.12", tasaPunitoria: "0.12"
  });
  const [ws, setWs] = useState({
    activo: false, accessToken: "", phoneNumberId: "", wabaId: ""
  });
  const [cuad, setCuad] = useState({ usuario: "", password: "" });
  const [p360, setP360] = useState({ apiKey: "", maxReintentos: "2", diasReintento: "5" });
  const [seguridad, setSeguridad] = useState({
    requierePin: false, pin: "", validarCbu: true, validarFirma: true,
    whatsappAuto: true, exportarExcel: true, registrarTransferencia: true
  });
  const [sucursalNombre, setSucursalNombre] = useState("");
  const [creandoSucursal, setCreandoSucursal] = useState(false);
  const [sucursalCreada, setSucursalCreada] = useState(false);

  // Cargar módulos habilitados
  useEffect(() => {
    const cargar = async () => {
      if (!entidadId) return;
      const snap = await getDoc(doc(db, "entidades", entidadId));
      const data = snap.data() as any;
      setModulos(data?.modulosHabilitados || {});
      if (data?.setupCompletado) router.push("/dashboard");
      if (data?.setupPaso > 0) setPasoActual(Math.min(data.setupPaso + 1, 6));
    };
    cargar();
  }, [entidadId]);

  const guardarPaso = async (paso: number, datos: any) => {
    setGuardando(true);
    try {
      const res = await fetch("/api/entidades/setup?accion=SETUP", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidadId, paso, datos }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (paso >= 6) { setCompletado(true); } else { setPasoActual(paso + 1); }
    } catch (e: any) {
      alert("Error al guardar: " + e.message);
    } finally { setGuardando(false); }
  };

  const crearSucursal = async () => {
    if (!sucursalNombre.trim()) return;
    setCreandoSucursal(true);
    try {
      await fetch("/api/sucursales", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidadId, nombre: sucursalNombre, esMatriz: true }),
      });
      setSucursalCreada(true);
    } finally { setCreandoSucursal(false); }
  };

  const validar = (paso: number): boolean => {
    const errs: Record<string,string> = {};
    if (paso === 1) {
      if (!tasas.tasaInteresBase) errs.tasaInteresBase = "Requerida";
    }
    if (paso === 5 && seguridad.requierePin && seguridad.pin.length < 4) {
      errs.pin = "El PIN debe tener al menos 4 dígitos";
    }
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const avanzar = (paso: number) => {
    if (!validar(paso)) return;
    const datos: Record<number, any> = {
      1: tasas,
      2: ws,
      3: modulos.cuad ? cuad : { omitido: true },
      4: modulos.pagos360 ? p360 : { omitido: true },
      5: seguridad,
      6: { sucursalNombre, sucursalCreada },
    };
    guardarPaso(paso, datos[paso]);
  };

  const Input = ({ label, value, onChange, type = "text", placeholder = "", error = "", disabled = false }: any) => (
    <div>
      <label className="block text-xs text-gray-500 uppercase font-bold tracking-widest mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-black border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gray-500 disabled:opacity-50 ${error ? "border-red-600" : "border-gray-800"}`}/>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );

  const Toggle = ({ label, desc, value, onChange }: any) => (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        {desc && <p className="text-[10px] text-gray-600 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)} type="button"
        className="w-10 h-5 rounded-full transition-all relative shrink-0 mt-0.5"
        style={{ backgroundColor: value ? colorPrimario : "#374151" }}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-5" : "left-0.5"}`}/>
      </button>
    </div>
  );

  // ── Pantalla de completado ────────────────────────────────────────────────
  if (completado) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ backgroundColor: colorPrimario }}>
          <Rocket size={36} className="text-white"/>
        </div>
        <h1 className="text-2xl font-black text-white">¡Setup completado!</h1>
        <p className="text-gray-400 text-sm">Tu plataforma está lista. Podés empezar a operar.</p>
        <button onClick={() => router.push("/dashboard")}
          className="w-full py-3.5 rounded-2xl font-black text-white" style={{ backgroundColor: colorPrimario }}>
          Ir al dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-5">

        {/* Header */}
        <div className="text-center">
          <p className="text-2xl font-black text-white">Configuración inicial</p>
          <p className="text-gray-500 text-sm mt-1">Paso {pasoActual} de {PASOS.length}</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between">
          {PASOS.map((p, i) => {
            const Icon = p.icon;
            const activo = p.id === pasoActual;
            const done   = p.id < pasoActual;
            return (
              <div key={p.id} className="flex items-center gap-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  done   ? "bg-green-600"           :
                  activo ? ""                        :
                  "bg-gray-900 border border-gray-800"}`}
                  style={activo ? { backgroundColor: colorPrimario } : {}}>
                  {done ? <CheckCircle2 size={14} className="text-white"/> : <Icon size={13} className={activo || done ? "text-white" : "text-gray-600"}/>}
                </div>
                {i < PASOS.length - 1 && <div className={`h-px w-6 sm:w-10 ${done ? "bg-green-600" : "bg-gray-800"}`}/>}
              </div>
            );
          })}
        </div>

        {/* Contenido del paso */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 space-y-4">

          {/* PASO 1: Tasas */}
          {pasoActual === 1 && (
            <>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Tasas y parámetros financieros</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="TNA base (%)" value={tasas.tasaInteresBase} onChange={(v:string) => setTasas(p=>({...p,tasaInteresBase:v}))} placeholder="80" error={errores.tasaInteresBase}/>
                <Input label="Gastos otorgamiento (%)" value={tasas.gastosOtorgamiento} onChange={(v:string) => setTasas(p=>({...p,gastosOtorgamiento:v}))} placeholder="3"/>
                <Input label="Seguro de vida (%)" value={tasas.seguroVidaPorc} onChange={(v:string) => setTasas(p=>({...p,seguroVidaPorc:v}))} placeholder="1.5"/>
                <Input label="Tasa moratoria diaria (%)" value={tasas.tasaMoratoria} onChange={(v:string) => setTasas(p=>({...p,tasaMoratoria:v}))} placeholder="0.12"/>
              </div>
            </>
          )}

          {/* PASO 2: WhatsApp */}
          {pasoActual === 2 && (
            <>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">WhatsApp (Meta Cloud API)</p>
              <Toggle label="Activar WhatsApp" desc="Notificaciones automáticas a clientes" value={ws.activo} onChange={(v:boolean) => setWs(p=>({...p,activo:v}))}/>
              {ws.activo && (
                <div className="space-y-3 pt-2">
                  <Input label="Access Token" type="password" value={ws.accessToken} onChange={(v:string)=>setWs(p=>({...p,accessToken:v}))} placeholder="EAABs..."/>
                  <Input label="Phone Number ID" value={ws.phoneNumberId} onChange={(v:string)=>setWs(p=>({...p,phoneNumberId:v}))} placeholder="123456789"/>
                  <Input label="WABA ID" value={ws.wabaId} onChange={(v:string)=>setWs(p=>({...p,wabaId:v}))} placeholder="987654321"/>
                </div>
              )}
              {!ws.activo && <p className="text-xs text-gray-600">Podés configurarlo después en Configuración → WhatsApp.</p>}
            </>
          )}

          {/* PASO 3: CUAD */}
          {pasoActual === 3 && (
            <>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Credenciales CUAD (Gobierno)</p>
              {modulos.cuad ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-900/10 border border-green-900/30 text-xs text-green-400">
                    <CheckCircle2 size={12}/> Módulo CUAD habilitado por Paysur
                  </div>
                  <Input label="Usuario CUAD" value={cuad.usuario} onChange={(v:string)=>setCuad(p=>({...p,usuario:v}))} placeholder="usuario_gobierno"/>
                  <Input label="Contraseña CUAD" type="password" value={cuad.password} onChange={(v:string)=>setCuad(p=>({...p,password:v}))} placeholder="••••••••"/>
                  <p className="text-[10px] text-gray-600">Credenciales asignadas por el Gobierno de Mendoza.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-gray-900/40 border border-gray-800 text-sm text-gray-500">
                  <AlertTriangle size={14} className="text-yellow-500"/>
                  Módulo CUAD no habilitado en tu plan. Contactá a Paysur para activarlo.
                </div>
              )}
            </>
          )}

          {/* PASO 4: Pagos 360 */}
          {pasoActual === 4 && (
            <>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Pagos 360</p>
              {modulos.pagos360 !== false ? (
                <div className="space-y-3">
                  <Input label="API Key" type="password" value={p360.apiKey} onChange={(v:string)=>setP360(p=>({...p,apiKey:v}))} placeholder="p360_live_..."/>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Máx reintentos" value={p360.maxReintentos} onChange={(v:string)=>setP360(p=>({...p,maxReintentos:v}))} placeholder="2"/>
                    <Input label="Días entre reintentos" value={p360.diasReintento} onChange={(v:string)=>setP360(p=>({...p,diasReintento:v}))} placeholder="5"/>
                  </div>
                  <p className="text-[10px] text-gray-600">Podés dejarlo vacío y completarlo después.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-gray-900/40 border border-gray-800 text-sm text-gray-500">
                  <AlertTriangle size={14} className="text-yellow-500"/>
                  Módulo Pagos 360 no habilitado en tu plan.
                </div>
              )}
            </>
          )}

          {/* PASO 5: Seguridad */}
          {pasoActual === 5 && (
            <>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Liquidación y seguridad</p>
              <div className="space-y-4">
                <Toggle label="PIN para liquidar" desc="Requiere código antes de ejecutar lotes" value={seguridad.requierePin} onChange={(v:boolean)=>setSeguridad(p=>({...p,requierePin:v}))}/>
                {seguridad.requierePin && (
                  <Input label="PIN (4-8 dígitos)" type="password" maxLength={8} value={seguridad.pin}
                    onChange={(v:string)=>setSeguridad(p=>({...p,pin:v}))} error={errores.pin}/>
                )}
                <div className="h-px bg-gray-900"/>
                <Toggle label="WhatsApp automático al liquidar" value={seguridad.whatsappAuto} onChange={(v:boolean)=>setSeguridad(p=>({...p,whatsappAuto:v}))}/>
                <Toggle label="Validar CBU antes de liquidar" value={seguridad.validarCbu} onChange={(v:boolean)=>setSeguridad(p=>({...p,validarCbu:v}))}/>
                <Toggle label="Validar firma antes de liquidar" value={seguridad.validarFirma} onChange={(v:boolean)=>setSeguridad(p=>({...p,validarFirma:v}))}/>
                <Toggle label="Registrar Nro de transferencia" value={seguridad.registrarTransferencia} onChange={(v:boolean)=>setSeguridad(p=>({...p,registrarTransferencia:v}))}/>
                <Toggle label="Exportar Excel del lote" value={seguridad.exportarExcel} onChange={(v:boolean)=>setSeguridad(p=>({...p,exportarExcel:v}))}/>
              </div>
            </>
          )}

          {/* PASO 6: Sucursal inicial */}
          {pasoActual === 6 && (
            <>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Primera sucursal</p>
              {!sucursalCreada ? (
                <div className="space-y-3">
                  <Input label="Nombre de la sucursal" value={sucursalNombre}
                    onChange={setSucursalNombre} placeholder="Casa Central / Mendoza"/>
                  <button onClick={crearSucursal} disabled={!sucursalNombre.trim() || creandoSucursal}
                    className="w-full py-2.5 rounded-xl border border-gray-700 text-sm font-bold text-gray-300 hover:text-white flex items-center justify-center gap-2 disabled:opacity-50">
                    {creandoSucursal ? <Loader2 size={13} className="animate-spin"/> : <Building2 size={13}/>}
                    Crear sucursal
                  </button>
                  <p className="text-[10px] text-gray-600">Podés agregar más sucursales después. Podés omitir este paso.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-900/10 border border-green-900/30 text-sm text-green-400">
                  <CheckCircle2 size={14}/> Sucursal "{sucursalNombre}" creada correctamente
                </div>
              )}
            </>
          )}

          {/* Botón avanzar */}
          <button onClick={() => avanzar(pasoActual)} disabled={guardando}
            className="w-full py-3.5 rounded-xl font-black text-white flex items-center justify-center gap-2 mt-2 disabled:opacity-60 transition-all hover:brightness-110"
            style={{ backgroundColor: colorPrimario }}>
            {guardando ? <Loader2 size={15} className="animate-spin"/> :
              pasoActual === PASOS.length
                ? <><Rocket size={15}/> Finalizar setup</>
                : <><Save size={15}/> Guardar y continuar <ChevronRight size={14}/></>}
          </button>

          {/* Omitir paso (excepto paso 1) */}
          {pasoActual > 1 && pasoActual < PASOS.length && (
            <button onClick={() => setPasoActual(p => p + 1)}
              className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Omitir este paso por ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetupEntidadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-gray-600" size={22}/></div>}>
      <SetupWizard/>
    </Suspense>
  );
}
