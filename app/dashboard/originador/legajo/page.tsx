"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, CreditCard, Landmark, Zap, ArrowLeft,
  User, Shield, Banknote, Save, UploadCloud, FileText
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────
function calcularCuil(dni: string, sexo: string): string {
  const dniStr = dni.padStart(8, "0");
  let prefijo = sexo === "F" ? "27" : "20";
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  const base = prefijo + dniStr;
  for (let i = 0; i < 10; i++) suma += parseInt(base[i]) * mult[i];
  let digito = 11 - (suma % 11);
  if (digito === 11) digito = 0;
  if (digito === 10) { prefijo = "23"; digito = sexo === "F" ? 4 : 9; }
  return prefijo + dniStr + digito.toString();
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// ─── Tipos ──────────────────────────────────────────────────
type Paso = "buscar" | "analizando" | "resultado" | "producto" | "formulario" | "ok";
type Producto = "PRIVADO" | "CUAD" | "ADELANTO";
type ResultadoScoring = "APROBADO" | "OBSERVADO" | "RECHAZADO";

// ─── Componentes auxiliares ─────────────────────────────────
const Badge = ({ ok, label }: { ok: boolean | null; label: string }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${
    ok === null ? "border-gray-800 text-gray-500" :
    ok ? "border-green-900 bg-green-900/10 text-green-400" :
    "border-red-900 bg-red-900/10 text-red-400"}`}>
    {ok === null ? <Loader2 size={12} className="animate-spin"/> :
     ok ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
    {label}
  </div>
);

// ─── Componente principal ───────────────────────────────────
export default function NuevoLegajoPage() {
  const { entidadData, userData } = useAuth();
  const router = useRouter();
  const color = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const modulos = entidadData?.modulosHabilitados || {};

  // Paso actual
  const [paso, setPaso] = useState<Paso>("buscar");

  // Datos cliente
  const [dni, setDni]   = useState("");
  const [sexo, setSexo] = useState("M");
  const [cuil, setCuil] = useState("");

  // Resultados consultas
  const [bcra, setBcra]         = useState<any>(null);
  const [juicios, setJuicios]   = useState<any>(null);
  const [cupo, setCupo]         = useState<any>(null);
  const [yaCliente, setYaCliente] = useState(false);
  const [nombreCliente, setNombreCliente] = useState("");

  // Scoring
  const [scoring, setScoring]   = useState<ResultadoScoring>("APROBADO");
  const [situacion, setSituacion] = useState(1);

  // Producto elegido
  const [producto, setProducto] = useState<Producto | null>(null);

  // Formulario crédito
  const [monto, setMonto]   = useState("");
  const [cuotas, setCuotas] = useState("12");
  const [archivos, setArchivos] = useState({ dniFrente: false, dniDorso: false, recibo: false });
  const [guardando, setGuardando] = useState(false);
  const [operacionId, setOperacionId] = useState<string | null>(null);

  // ── PASO 1: Evaluar ──────────────────────────────────────
  const evaluar = async () => {
    if (dni.length < 7) return;
    setPaso("analizando");

    const cuilCalculado = calcularCuil(dni, sexo);
    setCuil(cuilCalculado);

    // Consultas en paralelo
    const [resBcra, resJuicios, resCliente] = await Promise.allSettled([
      fetch("/api/bcra", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: dni, sexo }),
      }).then(r => r.json()),
      fetch("https://simply-bot-mendoza-278599265968.us-central1.run.app/api/consultar-juicios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      }).then(r => r.json()).catch(() => null),
      fetch(`/api/clientes/buscar?dni=${dni}&entidadId=${entidadData?.id}`).then(r => r.json()).catch(() => null),
    ]);

    // Procesar BCRA
    let bcraData = null;
    let sit = 1;
    if (resBcra.status === "fulfilled" && resBcra.value?.success) {
      bcraData = resBcra.value.bcra;
      sit = parseInt(bcraData?.peorSituacion || "1");
      if (bcraData?.nombre) setNombreCliente(bcraData.nombre);
      setBcra(bcraData);
    }
    setSituacion(sit);

    // Procesar juicios
    if (resJuicios.status === "fulfilled" && resJuicios.value?.success) {
      setJuicios(resJuicios.value.judicial);
      if (!nombreCliente && resJuicios.value.judicial?.registros?.[0]?.nombre)
        setNombreCliente(resJuicios.value.judicial.registros[0].nombre);
    }

    // ¿Ya es cliente?
    if (resCliente.status === "fulfilled" && resCliente.value?.existe) {
      setYaCliente(true);
      if (!nombreCliente && resCliente.value?.nombre) setNombreCliente(resCliente.value.nombre);
    }

    // Scoring
    const maxSit = entidadData?.scoring?.bcraMaxSituacion ?? 2;
    const tieneJuicios = resJuicios.status === "fulfilled" && resJuicios.value?.judicial?.registros?.length > 0;
    let resultado: ResultadoScoring = "APROBADO";
    if (sit > maxSit) resultado = entidadData?.scoring?.accionBcraExcedido === "RECHAZADO" ? "RECHAZADO" : "OBSERVADO";
    if (tieneJuicios && resultado !== "RECHAZADO") resultado = "OBSERVADO";
    setScoring(resultado);

    setPaso("resultado");
  };

  // ── PASO 3: Guardar operación ────────────────────────────
  const guardarOperacion = async () => {
    if (!monto || !producto) return;
    setGuardando(true);
    try {
      const montoNum  = parseInt(monto) || 0;
      const cuotasNum = parseInt(cuotas) || 12;
      const TEM = ((entidadData?.configuracion?.tasaInteresBase || 80) / 100) / 12;
      const cuota = Math.round((montoNum * TEM * Math.pow(1 + TEM, cuotasNum)) / (Math.pow(1 + TEM, cuotasNum) - 1));

      const res = await fetch("/api/operaciones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidadId:  entidadData?.id,
          vendedorId: userData?.uid,
          sucursalId: userData?.sucursalId,
          tipo:       producto,
          estado:     "EN_REVISION",
          cliente: { dni, cuil, nombre: nombreCliente, scoreBcra: situacion },
          financiero: { montoSolicitado: montoNum, cuotas: cuotasNum, valorCuota: cuota },
          scoring:    { resultado: scoring, situacionBcra: situacion },
          bcra:       bcra || {},
          legajo: {
            dniFrenteUrl: archivos.dniFrente ? "pendiente_upload" : null,
            dniDorsoUrl:  archivos.dniDorso  ? "pendiente_upload" : null,
          },
        }),
      });
      const data = await res.json();
      if (data.id || data.operacionId) {
        setOperacionId(data.id || data.operacionId);
        setPaso("ok");
      }
    } finally { setGuardando(false); }
  };

  const montoNum  = parseInt(monto) || 0;
  const cuotasNum = parseInt(cuotas) || 12;
  const TEM = ((entidadData?.configuracion?.tasaInteresBase || 80) / 100) / 12;
  const cuotaEstimada = montoNum && cuotasNum
    ? Math.round((montoNum * TEM * Math.pow(1 + TEM, cuotasNum)) / (Math.pow(1 + TEM, cuotasNum) - 1))
    : 0;

  const productosDisponibles = [
    { key: "PRIVADO",  label: "Crédito Personal", desc: "Préstamo personal con cuotas fijas", icono: <CreditCard size={24}/>, color: "#3b82f6", visible: !!modulos.privados || true },
    { key: "CUAD",     label: "Descuento Haberes", desc: "Descuento por nómina gobierno",      icono: <Landmark size={24}/>,    color: "#8b5cf6", visible: !!modulos.cuad },
    { key: "ADELANTO", label: "Adelanto de Sueldo", desc: "Anticipo de haberes vía Pagos 360", icono: <Zap size={24}/>,         color: "#10b981", visible: !!modulos.adelantos },
  ].filter(p => p.visible);

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">Nuevo Legajo</h1>
        <p className="text-gray-500 text-sm mt-1">
          {paso === "buscar"    && "Ingresá el DNI del cliente para comenzar"}
          {paso === "analizando"&& "Consultando BCRA, juicios y scoring..."}
          {paso === "resultado" && "Resultado del análisis de riesgo"}
          {paso === "producto"  && "Seleccioná el tipo de crédito"}
          {paso === "formulario"&& `Configurando ${producto === "PRIVADO" ? "Crédito Personal" : producto === "CUAD" ? "Descuento Haberes" : "Adelanto de Sueldo"}`}
          {paso === "ok"        && "Operación guardada exitosamente"}
        </p>
      </div>

      {/* ── PASO: BUSCAR ── */}
      {paso === "buscar" && (
        <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">DNI</label>
            <input
              type="number" value={dni} onChange={e => setDni(e.target.value)}
              placeholder="Ej: 33094813"
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white text-lg font-mono outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">Sexo (del DNI)</label>
            <div className="flex gap-3">
              {["M","F"].map(s => (
                <button key={s} onClick={() => setSexo(s)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${sexo === s ? "text-white border-transparent" : "text-gray-500 border-gray-800 hover:text-white"}`}
                  style={sexo === s ? { backgroundColor: color } : {}}>
                  {s === "M" ? "Masculino" : "Femenino"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={evaluar} disabled={dni.length < 7}
            className="w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-30 transition-all"
            style={{ backgroundColor: color }}>
            <Search size={16}/> Evaluar cliente
          </button>
        </div>
      )}

      {/* ── PASO: ANALIZANDO ── */}
      {paso === "analizando" && (
        <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-8 text-center space-y-4">
          <Loader2 size={36} className="animate-spin mx-auto" style={{ color }}/>
          <p className="font-black text-white">Analizando perfil crediticio</p>
          <div className="space-y-2">
            {["Consultando Central de Deudores BCRA...","Verificando juicios y concursos...","Revisando historial en la entidad..."].map((t,i) => (
              <p key={i} className="text-xs text-gray-500 animate-pulse" style={{ animationDelay: `${i*0.3}s` }}>{t}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── PASO: RESULTADO ── */}
      {paso === "resultado" && (
        <div className="space-y-4">
          {/* Card resultado */}
          <div className={`rounded-2xl p-6 border ${
            scoring === "APROBADO"  ? "bg-green-900/10 border-green-900/40" :
            scoring === "OBSERVADO" ? "bg-yellow-900/10 border-yellow-900/40" :
                                      "bg-red-900/10 border-red-900/40"}`}>
            <div className="flex items-center gap-3 mb-3">
              {scoring === "APROBADO"  && <CheckCircle2 size={22} className="text-green-400"/>}
              {scoring === "OBSERVADO" && <AlertTriangle size={22} className="text-yellow-400"/>}
              {scoring === "RECHAZADO" && <XCircle size={22} className="text-red-400"/>}
              <p className={`text-xl font-black ${
                scoring === "APROBADO" ? "text-green-400" : scoring === "OBSERVADO" ? "text-yellow-400" : "text-red-400"}`}>
                {scoring}
              </p>
            </div>
            {nombreCliente && <p className="text-white font-bold text-lg">{nombreCliente}</p>}
            <p className="text-gray-500 text-sm font-mono">DNI {dni} · CUIL {cuil}</p>
          </div>

          {/* Checks */}
          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Detalle del análisis</p>
            <div className="flex flex-wrap gap-2">
              <Badge ok={bcra !== null ? situacion <= 2 : null} label={`BCRA Sit. ${situacion}`}/>
              <Badge ok={juicios !== null ? (juicios?.registros?.length || 0) === 0 : null}
                label={juicios ? `${juicios?.registros?.length || 0} juicios` : "Juicios"}/>
              <Badge ok={!yaCliente} label={yaCliente ? "Ya es cliente" : "Cliente nuevo"}/>
            </div>
            {bcra?.tieneChequesRechazados && (
              <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                <AlertTriangle size={11}/> Tiene cheques rechazados
              </p>
            )}
          </div>

          {/* Acciones */}
          {scoring !== "RECHAZADO" && (
            <button onClick={() => setPaso("producto")}
              className="w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: color }}>
              Continuar con el crédito <ChevronRight size={16}/>
            </button>
          )}
          {scoring === "OBSERVADO" && (
            <p className="text-xs text-yellow-500 text-center">El cliente tiene observaciones. Podés continuar pero el supervisor deberá aprobar.</p>
          )}
          <button onClick={() => { setPaso("buscar"); setDni(""); setBcra(null); setJuicios(null); setNombreCliente(""); }}
            className="w-full py-3 rounded-xl font-bold text-gray-500 hover:text-white text-sm flex items-center justify-center gap-2">
            <ArrowLeft size={14}/> Nueva consulta
          </button>
        </div>
      )}

      {/* ── PASO: ELEGIR PRODUCTO ── */}
      {paso === "producto" && (
        <div className="space-y-3">
          {productosDisponibles.map(p => (
            <button key={p.key} onClick={() => { setProducto(p.key as Producto); setPaso("formulario"); }}
              className="w-full bg-[#0A0A0A] border border-gray-900 hover:border-gray-600 rounded-2xl p-5 flex items-center gap-4 transition-all text-left">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${p.color}20`, color: p.color }}>
                {p.icono}
              </div>
              <div className="flex-1">
                <p className="font-black text-white">{p.label}</p>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </div>
              <ChevronRight size={18} className="text-gray-600"/>
            </button>
          ))}
          <button onClick={() => setPaso("resultado")}
            className="w-full py-3 rounded-xl font-bold text-gray-500 hover:text-white text-sm flex items-center justify-center gap-2">
            <ArrowLeft size={14}/> Volver
          </button>
        </div>
      )}

      {/* ── PASO: FORMULARIO ── */}
      {paso === "formulario" && (
        <div className="space-y-4">
          {/* Info cliente */}
          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-4 flex items-center gap-3">
            <User size={16} className="text-gray-500"/>
            <div>
              <p className="text-white font-bold text-sm">{nombreCliente || `DNI ${dni}`}</p>
              <p className="text-xs text-gray-500">DNI {dni} · {producto === "PRIVADO" ? "Crédito Personal" : producto === "CUAD" ? "Descuento Haberes" : "Adelanto de Sueldo"}</p>
            </div>
          </div>

          {/* Monto */}
          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5 space-y-4">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Estructura del crédito</p>
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">Monto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="150000"
                  className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 pl-8 text-white text-lg font-mono outline-none focus:border-orange-500"/>
              </div>
            </div>
            {producto !== "ADELANTO" && (
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">Cuotas</label>
                <select value={cuotas} onChange={e => setCuotas(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500 font-bold">
                  {[1,3,6,9,12,18,24,36].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? "cuota" : "cuotas"}</option>
                  ))}
                </select>
              </div>
            )}
            {montoNum > 0 && (
              <div className="bg-black border border-gray-800 rounded-xl p-3 flex justify-between items-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Cuota estimada</p>
                <p className="text-white font-black font-mono">{fmt(cuotaEstimada)}</p>
              </div>
            )}
          </div>

          {/* Documentación */}
          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Documentación</p>
            {[
              { key: "dniFrente", label: "DNI Frente" },
              { key: "dniDorso",  label: "DNI Dorso" },
              { key: "recibo",    label: "Recibo de Sueldo" },
            ].map(d => (
              <button key={d.key} onClick={() => setArchivos(p => ({ ...p, [d.key]: !p[d.key as keyof typeof p] }))}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  (archivos as any)[d.key] ? "bg-green-900/20 border-green-900 text-green-400" : "bg-black border-gray-800 text-gray-500 hover:border-gray-600"}`}>
                <span className="font-bold flex items-center gap-2 text-sm"><FileText size={14}/>{d.label}</span>
                {(archivos as any)[d.key] ? <CheckCircle2 size={15}/> : <UploadCloud size={15}/>}
              </button>
            ))}
          </div>

          {/* Guardar */}
          <button onClick={guardarOperacion} disabled={!montoNum || guardando}
            className="w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-30"
            style={{ backgroundColor: color }}>
            {guardando ? <><Loader2 size={14} className="animate-spin"/> Guardando...</> : <><Save size={14}/> Guardar operación</>}
          </button>

          <button onClick={() => setPaso("producto")}
            className="w-full py-3 rounded-xl font-bold text-gray-500 hover:text-white text-sm flex items-center justify-center gap-2">
            <ArrowLeft size={14}/> Cambiar producto
          </button>
        </div>
      )}

      {/* ── PASO: OK ── */}
      {paso === "ok" && (
        <div className="bg-[#0A0A0A] border border-green-900/40 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="text-green-400 mx-auto"/>
          <p className="text-xl font-black text-white">Operación guardada</p>
          <p className="text-gray-500 text-sm">Estado: EN REVISIÓN · ID: {operacionId}</p>
          <div className="flex gap-3">
            <button onClick={() => router.push(`/dashboard/aprobacion`)}
              className="flex-1 py-3 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: color }}>
              Ver en aprobación
            </button>
            <button onClick={() => { setPaso("buscar"); setDni(""); setMonto(""); setBcra(null); setJuicios(null); setNombreCliente(""); setProducto(null); setArchivos({ dniFrente: false, dniDorso: false, recibo: false }); }}
              className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white border border-gray-800 text-sm">
              Nuevo legajo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
