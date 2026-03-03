"use client";
// app/admin/onboarding/page.tsx
// MASTER_PAYSUR crea la entidad, define módulos habilitados, crea el gerente
// y genera un link de invitación para que la entidad complete el setup
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Building2, Shield, User, CheckCircle2, Copy,
  ChevronRight, Loader2, AlertTriangle, Rocket
} from "lucide-react";

const PASOS_ADMIN = ["Datos entidad", "Módulos", "Gerente", "Link setup"];

const MODULO_INFO: Record<string, { label: string; desc: string }> = {
  cuad:        { label: "CUAD",        desc: "Créditos con descuento por haberes gubernamentales" },
  adelantos:   { label: "Adelantos",   desc: "Adelantos de sueldo vía Pagos 360"                 },
  privados:    { label: "Privados",    desc: "Créditos personales sin descuento por haberes"      },
  fondeadores: { label: "Fondeadores", desc: "Motor de subasta entre fondeadores externos"        },
  renovaciones:{ label: "Renovaciones",desc: "Módulo de renovación de créditos activos"           },
  pagos360:    { label: "Pagos 360",   desc: "Cobro automático de cuotas vía débito CBU"          },
};

export default function OnboardingEntidadPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [paso,       setPaso]       = useState(0);
  const [guardando,  setGuardando]  = useState(false);
  const [entidadId,  setEntidadId]  = useState("");
  const [linkSetup,  setLinkSetup]  = useState("");
  const [copiado,    setCopiado]    = useState(false);

  // Paso 0: datos entidad
  const [entidad, setEntidad] = useState({
    razonSocial: "", nombreFantasia: "", cuit: "", emailContacto: "", telefonoContacto: ""
  });

  // Paso 1: módulos
  const [modulos, setModulos] = useState<Record<string, boolean>>({
    cuad: true, adelantos: true, privados: true,
    fondeadores: false, renovaciones: false, pagos360: false,
  });

  // Paso 2: gerente
  const [gerente, setGerente] = useState({ nombre: "", email: "", password: "" });
  const [gerenteCreado, setGerenteCreado] = useState(false);

  const colorPrimario = "#FF5E14";

  const crearEntidad = async () => {
    setGuardando(true);
    try {
      const res = await fetch("/api/entidades/setup?accion=CREAR", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entidad, ...modulos, usuarioEmail: userData?.email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setEntidadId(data.entidadId);
      setPaso(1);
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setGuardando(false); }
  };

  const guardarModulos = () => setPaso(2);  // ya están en estado

  const crearGerente = async () => {
    setGuardando(true);
    try {
      const res = await fetch("/api/entidades/setup?accion=GERENTE", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidadId, ...gerente }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setGerenteCreado(true);

      // Generar link de setup
      const base = window.location.origin;
      const link = `${base}/setup/entidad?entidadId=${entidadId}`;
      setLinkSetup(link);
      setPaso(3);
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setGuardando(false); }
  };

  const copiar = () => {
    navigator.clipboard.writeText(linkSetup);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const Input = ({ label, value, onChange, type = "text", placeholder = "", required = false }: any) => (
    <div>
      <label className="block text-xs text-gray-500 uppercase font-bold tracking-widest mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gray-600"/>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin")} className="text-gray-600 hover:text-white text-sm">← Admin</button>
        <h1 className="text-xl font-black text-white">Nueva entidad</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {PASOS_ADMIN.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              i < paso   ? "bg-green-900/30 text-green-400" :
              i === paso ? "text-white"                      :
              "text-gray-600"}`}
              style={i === paso ? { backgroundColor: colorPrimario } : {}}>
              {i < paso ? <CheckCircle2 size={11}/> : <span>{i+1}</span>}
              {p}
            </div>
            {i < PASOS_ADMIN.length - 1 && <ChevronRight size={12} className="text-gray-700"/>}
          </div>
        ))}
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 space-y-5">

        {/* ── PASO 0: Datos entidad ─────────────────────────────────────── */}
        {paso === 0 && (
          <>
            <div className="flex items-center gap-2">
              <Building2 size={16} style={{ color: colorPrimario }}/>
              <p className="font-black text-white">Datos de la entidad</p>
            </div>
            <div className="space-y-3">
              <Input label="Razón social" value={entidad.razonSocial}
                onChange={(v:string) => setEntidad(p=>({...p,razonSocial:v}))} required/>
              <Input label="Nombre fantasía" value={entidad.nombreFantasia}
                onChange={(v:string) => setEntidad(p=>({...p,nombreFantasia:v}))} placeholder="Ej: Créditos del Sur"/>
              <Input label="CUIT" value={entidad.cuit}
                onChange={(v:string) => setEntidad(p=>({...p,cuit:v}))} placeholder="20-12345678-9"/>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Email contacto" type="email" value={entidad.emailContacto}
                  onChange={(v:string) => setEntidad(p=>({...p,emailContacto:v}))}/>
                <Input label="Teléfono" value={entidad.telefonoContacto}
                  onChange={(v:string) => setEntidad(p=>({...p,telefonoContacto:v}))} placeholder="261 4000000"/>
              </div>
            </div>
            <button onClick={crearEntidad}
              disabled={guardando || !entidad.razonSocial || !entidad.cuit}
              className="w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: colorPrimario }}>
              {guardando ? <Loader2 size={14} className="animate-spin"/> : <ChevronRight size={14}/>}
              Crear entidad
            </button>
          </>
        )}

        {/* ── PASO 1: Módulos ───────────────────────────────────────────── */}
        {paso === 1 && (
          <>
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: colorPrimario }}/>
              <div>
                <p className="font-black text-white">Módulos habilitados</p>
                <p className="text-[10px] text-gray-600">La entidad solo puede usar lo que vos activás aquí</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(MODULO_INFO).map(([key, info]) => (
                <div key={key} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-900/30 border border-gray-800">
                  <div>
                    <p className="text-sm font-bold text-white">{info.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{info.desc}</p>
                  </div>
                  <button onClick={() => setModulos(p=>({...p,[key]:!p[key]}))} type="button"
                    className="w-10 h-5 rounded-full transition-all relative shrink-0 mt-0.5"
                    style={{ backgroundColor: modulos[key] ? colorPrimario : "#374151" }}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${modulos[key] ? "left-5" : "left-0.5"}`}/>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={guardarModulos}
              className="w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: colorPrimario }}>
              <ChevronRight size={14}/> Confirmar módulos
            </button>
          </>
        )}

        {/* ── PASO 2: Gerente ───────────────────────────────────────────── */}
        {paso === 2 && (
          <>
            <div className="flex items-center gap-2">
              <User size={16} style={{ color: colorPrimario }}/>
              <div>
                <p className="font-black text-white">Primer GERENTE_GENERAL</p>
                <p className="text-[10px] text-gray-600">Este usuario completa el setup y administra la entidad</p>
              </div>
            </div>
            <div className="space-y-3">
              <Input label="Nombre completo" value={gerente.nombre}
                onChange={(v:string)=>setGerente(p=>({...p,nombre:v}))}/>
              <Input label="Email" type="email" value={gerente.email}
                onChange={(v:string)=>setGerente(p=>({...p,email:v}))} placeholder="gerente@entidad.com"/>
              <Input label="Contraseña temporal" type="password" value={gerente.password}
                onChange={(v:string)=>setGerente(p=>({...p,password:v}))} placeholder="Mínimo 6 caracteres"/>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-900/10 border border-yellow-900/30 text-xs text-yellow-400">
              <AlertTriangle size={12} className="shrink-0 mt-0.5"/>
              Compartí estas credenciales al gerente de forma segura. Deberá cambiar la contraseña al ingresar.
            </div>
            <button onClick={crearGerente}
              disabled={guardando || !gerente.email || !gerente.password || gerente.password.length < 6}
              className="w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: colorPrimario }}>
              {guardando ? <Loader2 size={14} className="animate-spin"/> : <User size={14}/>}
              Crear gerente
            </button>
          </>
        )}

        {/* ── PASO 3: Link setup ────────────────────────────────────────── */}
        {paso === 3 && (
          <>
            <div className="flex items-center gap-2">
              <Rocket size={16} style={{ color: colorPrimario }}/>
              <div>
                <p className="font-black text-white">¡Entidad creada!</p>
                <p className="text-[10px] text-gray-600">Enviá este link al gerente para que complete la configuración</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900/50 border border-gray-800">
                <p className="text-xs text-gray-400 font-mono flex-1 truncate">{linkSetup}</p>
                <button onClick={copiar}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    copiado ? "text-green-400 bg-green-900/20" : "text-gray-400 hover:text-white border border-gray-700"}`}>
                  {copiado ? <CheckCircle2 size={11}/> : <Copy size={11}/>}
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-[10px] text-gray-600">El gerente usa este link + sus credenciales para completar las 6 etapas del setup.</p>
            </div>

            {/* Resumen de lo creado */}
            <div className="space-y-2">
              {[
                { label: "Entidad ID",  valor: entidadId.slice(0,12) + "..." },
                { label: "Módulos",     valor: Object.entries(modulos).filter(([,v])=>v).map(([k])=>k).join(", ") || "ninguno" },
                { label: "Gerente",     valor: gerente.email },
              ].map((r, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-900">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="text-white font-bold">{r.valor}</span>
                </div>
              ))}
            </div>

            <button onClick={() => router.push("/admin")}
              className="w-full py-3 rounded-xl font-black border border-gray-700 text-gray-300 hover:text-white text-sm">
              Volver al panel admin
            </button>
          </>
        )}
      </div>
    </div>
  );
}
