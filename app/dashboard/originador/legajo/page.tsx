"use client";
const BOT_URL = "https://simply-bot-mendoza-278599265960.us-central1.run.app";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, CreditCard, Landmark, Zap, ArrowLeft,
  User, Save, UploadCloud, FileText, X, Building2, Gavel
} from "lucide-react";

function calcularCuil(dni: string, sexo: string): string {
  const dniStr = dni.padStart(8, "0");
  let prefijo = sexo === "F" ? "27" : "20";
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  // Paso 1: calcular con prefijo inicial (20 o 27)
  const base = prefijo + dniStr;
  let suma = 0;
  for (let i = 0; i < 10; i++) suma += parseInt(base[i]) * mult[i];
  const resto = suma % 11;

  let digito: number;

  if (resto === 0) {
    // Caso A: dígito es 0
    digito = 0;
  } else if (resto === 1) {
    // Caso B: prefijo cambia a 23, dígito fijo según sexo
    prefijo = "23";
    digito = sexo === "F" ? 4 : 9;
  } else {
    // Caso C: 11 - resto
    digito = 11 - resto;
  }

  return prefijo + dniStr + digito.toString();
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);


type Paso = "buscar" | "analizando" | "resultado" | "producto" | "formulario" | "ok" | "elegir_persona";
type Producto = "PRIVADO" | "CUAD" | "ADELANTO";
type ResultadoScoring = "APROBADO" | "OBSERVADO" | "RECHAZADO";
type ModalTipo = "bcra" | "juicios" | null;

// ── Modal ────────────────────────────────────────────────────
function Modal({ tipo, bcra, juicios, onClose }: { tipo: ModalTipo; bcra: any; juicios: any; onClose: () => void }) {
  if (!tipo) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {tipo === "bcra" ? <Building2 size={16} className="text-purple-400"/> : <Gavel size={16} className="text-orange-400"/>}
            <p className="font-black text-white">{tipo === "bcra" ? "Central de Deudores BCRA" : "Juicios Universales"}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18}/></button>
        </div>

        <div className="p-5 space-y-4">
          {tipo === "bcra" && bcra && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black rounded-xl p-3 border border-gray-900">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Situación</p>
                  <p className={`text-2xl font-black ${parseInt(bcra.peorSituacion) <= 2 ? "text-green-400" : parseInt(bcra.peorSituacion) === 3 ? "text-yellow-400" : "text-red-400"}`}>
                    {bcra.peorSituacion}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {bcra.peorSituacion == 1 ? "Normal" : bcra.peorSituacion == 2 ? "Con seguimiento" : bcra.peorSituacion == 3 ? "Con problemas" : bcra.peorSituacion == 4 ? "Alto riesgo" : "Irrecuperable"}
                  </p>
                </div>
                <div className="bg-black rounded-xl p-3 border border-gray-900">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Deuda total</p>
                  <p className="text-xl font-black text-white">
                    {bcra.detalles?.reduce((a: number, d: any) => a + (d.monto || 0), 0) > 0
                      ? fmt(bcra.detalles.reduce((a: number, d: any) => a + (d.monto || 0), 0))
                      : "Sin deuda"}
                  </p>
                </div>
              </div>

              {bcra.tieneChequesRechazados && (
                <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-400"/>
                  <p className="text-red-400 text-xs font-bold">Tiene cheques rechazados</p>
                </div>
              )}

              {bcra.detalles?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Detalle por entidad</p>
                  {bcra.detalles.map((d: any, i: number) => (
                    <div key={i} className="bg-black border border-gray-900 rounded-xl p-3">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-white">{d.entidad}</p>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${d.situacion <= 2 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                          Sit. {d.situacion}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1">
                        <p className="text-xs text-gray-500">Monto: <span className="text-white font-bold">{fmt(d.monto || 0)}</span></p>
                        {d.diasAtraso > 0 && <p className="text-xs text-gray-500">Atraso: <span className="text-red-400 font-bold">{d.diasAtraso}d</span></p>}
                        <p className="text-xs text-gray-500">Período: <span className="text-white font-bold">{d.periodo}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 size={28} className="text-green-400 mx-auto mb-2"/>
                  <p className="text-green-400 font-bold">Sin deudas registradas</p>
                  <p className="text-xs text-gray-500 mt-1">El cliente no figura en la Central de Deudores</p>
                </div>
              )}
            </>
          )}

          {tipo === "juicios" && (
            <>
              {!juicios ? (
                <div className="text-center py-6">
                  <XCircle size={28} className="text-red-400 mx-auto mb-2"/>
                  <p className="text-red-400 font-bold">Error al consultar</p>
                  <p className="text-xs text-gray-500 mt-1">No se pudo conectar con el Registro de Juicios</p>
                </div>
              ) : juicios.registros?.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={28} className="text-green-400 mx-auto mb-2"/>
                  <p className="text-green-400 font-bold">Sin juicios registrados</p>
                  <p className="text-xs text-gray-500 mt-1">No figura en el Registro de Juicios Universales de Mendoza</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{juicios.registros.length} registro(s) encontrado(s)</p>
                  {juicios.registros.map((r: any, i: number) => (
                    <div key={i} className="bg-black border border-red-900/30 rounded-xl p-3 space-y-1">
                      <p className="text-sm font-black text-white">{r.tipo}</p>
                      <p className="text-xs text-gray-400">{r.nombre}</p>
                      <div className="flex gap-3 text-[10px] text-gray-500 flex-wrap">
                        <span>Exp: {r.expediente}</span>
                        <span>Tribunal: {r.tribunal}</span>
                        <span>Fecha: {r.fecha}</span>
                      </div>
                      {r.certificadoUrl && (
                        <a href={r.certificadoUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-400 underline">Ver certificado</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card de consulta ─────────────────────────────────────────
function CardConsulta({ icono, titulo, status, resumen, sinInfo, onClick }: {
  icono: React.ReactNode; titulo: string;
  status: "idle"|"procesando"|"ok"|"error";
  resumen?: string; sinInfo?: boolean; onClick?: () => void;
}) {
  const borde = sinInfo ? "border-purple-900/50 text-purple-400"
    : status === "idle"       ? "border-gray-800 text-gray-500"
    : status === "procesando" ? "border-gray-700 text-gray-400"
    : status === "ok"         ? "border-green-900/50 text-green-400"
    :                           "border-red-900/50 text-red-400";
  return (
    <button onClick={onClick} disabled={status === "idle" || status === "procesando"}
      className={`bg-[#0A0A0A] border rounded-2xl p-4 text-left transition-all w-full ${borde} ${status === "ok" ? "hover:border-green-700 cursor-pointer" : "cursor-default"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">{icono} {titulo}</div>
        {status === "procesando" && <Loader2 size={13} className="animate-spin"/>}
        {status === "ok" && !sinInfo && <CheckCircle2 size={13} className="text-green-400"/>}
        {sinInfo           && <span className="text-[10px] font-black text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded-full">SIN INFO</span>}
        {status === "error"&& <AlertTriangle size={13} className="text-red-400"/>}
      </div>
      {resumen && <p className={`text-sm font-bold ${sinInfo ? "text-purple-400" : ""}`}>{sinInfo ? "Sin información en el sistema financiero" : resumen}</p>}
      {status === "ok" && !sinInfo && <p className="text-[10px] text-gray-600 mt-1">Presioná para ver detalle →</p>}
      {status === "error" && <p className="text-[10px] text-red-500 mt-1">Error al consultar</p>}
    </button>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function NuevoLegajoPage() {
  const { entidadData, userData } = useAuth();
  const router = useRouter();
  const color = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const modulos = entidadData?.modulosHabilitados || {};

  const [paso, setPaso]     = useState<Paso>("buscar");
  const [dni, setDni]       = useState("");
  const [sexo, setSexo]     = useState("M");
  const [cuil, setCuil]     = useState("");
  const [bcra, setBcra]     = useState<any>(null);
  const [juicios, setJuicios] = useState<any>(null);
  const [yaCliente, setYaCliente] = useState(false);
  const [nombreCliente, setNombreCliente] = useState("");
  const [scoring, setScoring]   = useState<ResultadoScoring>("APROBADO");
  const [situacion, setSituacion] = useState(1);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [monto, setMonto]   = useState("");
  const [cuotas, setCuotas] = useState("12");
  const [archivos, setArchivos] = useState({ dniFrente: false, dniDorso: false, recibo: false });
  const [guardando, setGuardando] = useState(false);
  const [operacionId, setOperacionId] = useState<string | null>(null);
  const [modal, setModal]   = useState<ModalTipo>(null);

  const [stBcra,    setStBcra]    = useState<"idle"|"procesando"|"ok"|"error">("idle");
  const [stJuicios, setStJuicios] = useState<"idle"|"procesando"|"ok"|"error">("idle");
  const [stCliente, setStCliente] = useState<"idle"|"procesando"|"ok"|"error">("idle");
  const [cuadData,  setCuadData]  = useState<any>(null);
  const [sinInfoBcra, setSinInfoBcra] = useState(false);
  const [opcionesBcra, setOpcionesBcra] = useState<any[]>([]);
  const [stCuad,    setStCuad]    = useState<"idle"|"procesando"|"ok"|"error"|"no_empleado">("idle");

  // ── EVALUAR: consulta BCRA con ambos sexos, detecta automáticamente ──
  const evaluar = async () => {
    if (dni.length < 7) return;
    setPaso("analizando");
    setStBcra("procesando"); setStJuicios("procesando"); setStCliente("procesando");
    setSinInfoBcra(false); setOpcionesBcra([]);

    // 1. Consultar BCRA con ambos sexos en paralelo
    const [resM, resF, resJuicios] = await Promise.allSettled([
      fetch("/api/bcra/consultar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: dni, sexo: "M" }),
      }).then(r => r.json()),
      fetch("/api/bcra/consultar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: dni, sexo: "F" }),
      }).then(r => r.json()),
      fetch(`${BOT_URL}/api/consultar-juicios`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      }).then(r => r.json()),
    ]);

    // 2. Analizar resultados BCRA
    const bcraM = resM.status === "fulfilled" && resM.value?.success ? resM.value.bcra : null;
    const bcraF = resF.status === "fulfilled" && resF.value?.success ? resF.value.bcra : null;

    const tieneNombreM = bcraM?.nombre && bcraM.nombre.trim().length > 0;
    const tieneNombreF = bcraF?.nombre && bcraF.nombre.trim().length > 0;
    const tieneDatosM  = bcraM && (tieneNombreM || bcraM.cuil);
    const tieneDatosF  = bcraF && (tieneNombreF || bcraF.cuil);

    let bcraFinal: any = null;
    let sexoDetectado = "M";

    if (tieneDatosM && tieneDatosF && tieneNombreM && tieneNombreF) {
      // Ambos devolvieron datos con nombre — ¿son la misma persona?
      if (bcraM.nombre?.trim().toUpperCase() === bcraF.nombre?.trim().toUpperCase()) {
        // Misma persona, usar masculino por defecto
        bcraFinal = bcraM;
        sexoDetectado = "M";
      } else {
        // Dos personas diferentes — dejar que el vendedor elija
        setOpcionesBcra([
          { ...bcraM, cuil: bcraM.cuil || calcularCuil(dni, "M"), sexo: "M" },
          { ...bcraF, cuil: bcraF.cuil || calcularCuil(dni, "F"), sexo: "F" },
        ]);
        // Juicios igual los procesamos
        procesarJuicios(resJuicios);
        setPaso("elegir_persona");
        setStBcra("ok");
        setStCliente("ok");
        return;
      }
    } else if (tieneDatosM) {
      bcraFinal = bcraM;
      sexoDetectado = "M";
    } else if (tieneDatosF) {
      bcraFinal = bcraF;
      sexoDetectado = "F";
    } else {
      // Ninguno devolvió datos — SIN INFO
      setSinInfoBcra(true);
      setStBcra("ok");
    }

    if (bcraFinal) {
      setBcra(bcraFinal);
      setSexo(sexoDetectado);
      const cuilCalc = bcraFinal.cuil || calcularCuil(dni, sexoDetectado);
      setCuil(cuilCalc);
      if (bcraFinal.nombre) setNombreCliente(bcraFinal.nombre);
      const sit = parseInt(bcraFinal.peorSituacion || "1");
      setSituacion(sit);
      setStBcra("ok");
    } else {
      // Sin datos — calcular CUIL genérico
      setCuil(calcularCuil(dni, "M"));
      setSituacion(1);
      setStBcra("ok");
    }

    // 3. Juicios
    procesarJuicios(resJuicios);

    // 4. Historial interno
    setStCliente("ok");

    // 5. Scoring
    calcularScoringLocal(bcraFinal, resJuicios);
    setPaso("resultado");
  };

  // Helper: procesar resultado de juicios
  const procesarJuicios = (resJuicios: PromiseSettledResult<any>) => {
    if (resJuicios.status === "fulfilled" && resJuicios.value?.success) {
      setJuicios(resJuicios.value.judicial);
      if (!nombreCliente && resJuicios.value.judicial?.registros?.[0]?.nombre)
        setNombreCliente(resJuicios.value.judicial.registros[0].nombre);
      setStJuicios("ok");
    } else {
      setStJuicios("error");
    }
  };

  // Helper: calcular scoring local
  const calcularScoringLocal = (bcraData: any, resJuicios: PromiseSettledResult<any>) => {
    const sit = bcraData ? parseInt(bcraData.peorSituacion || "1") : 1;
    const tieneJuicios = resJuicios.status === "fulfilled" &&
      (resJuicios.value?.judicial?.registros?.length || 0) > 0;
    const dniValido = !!bcraData?.nombre;

    const maxSit = entidadData?.scoring?.bcraMaxSituacion ?? 2;
    let resultado: ResultadoScoring = "APROBADO";
    if (!dniValido) resultado = "OBSERVADO";
    if (sit > maxSit) resultado = entidadData?.scoring?.accionBcraExcedido === "RECHAZADO" ? "RECHAZADO" : "OBSERVADO";
    if (tieneJuicios && resultado !== "RECHAZADO") resultado = "OBSERVADO";
    setScoring(resultado);
  };

  // Cuando el vendedor elige una persona de las opciones
  const elegirPersona = (opcion: any) => {
    setBcra(opcion);
    setNombreCliente(opcion.nombre);
    setCuil(opcion.cuil);
    setSexo(opcion.sexo || (opcion.cuil?.startsWith("27") ? "F" : "M"));
    const sit = parseInt(opcion.peorSituacion || "1");
    setSituacion(sit);

    // Recalcular scoring con la persona elegida
    const maxSit = entidadData?.scoring?.bcraMaxSituacion ?? 2;
    const tieneJuicios = (juicios?.registros?.length || 0) > 0;
    let resultado: ResultadoScoring = "APROBADO";
    if (sit > maxSit) resultado = entidadData?.scoring?.accionBcraExcedido === "RECHAZADO" ? "RECHAZADO" : "OBSERVADO";
    if (tieneJuicios && resultado !== "RECHAZADO") resultado = "OBSERVADO";
    setScoring(resultado);

    setStBcra("ok");
    setPaso("resultado");
  };

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
          entidadId: entidadData?.id, vendedorId: userData?.uid, sucursalId: userData?.sucursalId,
          tipo: producto, estado: "EN_REVISION",
          cliente: { dni, cuil, nombre: nombreCliente, scoreBcra: situacion },
          financiero: { montoSolicitado: montoNum, cuotas: cuotasNum, valorCuota: cuota },
          scoring: { resultado: scoring, situacionBcra: situacion },
          bcra: bcra || {},
          legajo: {
            dniFrenteUrl: archivos.dniFrente ? "pendiente_upload" : null,
            dniDorsoUrl:  archivos.dniDorso  ? "pendiente_upload" : null,
          },
        }),
      });
      const data = await res.json();
      if (data.id || data.operacionId) { setOperacionId(data.id || data.operacionId); setPaso("ok"); }
    } finally { setGuardando(false); }
  };

  const elegirProducto = async (p: Producto) => {
    setProducto(p);
    if (p === "CUAD") {
      setPaso("analizando");
      setStCuad("procesando");
      try {
        const res = await fetch("/api/cuad/consultar", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni, sexo, entidadId: entidadData?.id }),
        });
        const data = await res.json();
        if (data.noRegistra) { setStCuad("no_empleado"); }
        else if (data.success) { setCuadData({ maximo: data.cupoDisponible, iteraciones: data.iteraciones }); setStCuad("ok"); }
        else setStCuad("error");
      } catch { setStCuad("error"); }
      setPaso("formulario");
    } else {
      setPaso("formulario");
    }
  };

  const montoNum  = parseInt(monto) || 0;
  const cuotasNum = parseInt(cuotas) || 12;
  const TEM = ((entidadData?.configuracion?.tasaInteresBase || 80) / 100) / 12;
  const cuotaEstimada = montoNum && cuotasNum
    ? Math.round((montoNum * TEM * Math.pow(1 + TEM, cuotasNum)) / (Math.pow(1 + TEM, cuotasNum) - 1))
    : 0;

  const productosDisponibles = [
    { key: "PRIVADO",  label: "Crédito Personal",   desc: "Préstamo personal con cuotas fijas",   icono: <CreditCard size={22}/>, color: "#3b82f6", visible: !!modulos.privados },
    { key: "CUAD",     label: "Descuento Haberes",   desc: "Descuento por nómina gobierno",        icono: <Landmark size={22}/>,   color: "#8b5cf6", visible: !!modulos.cuad },
    { key: "ADELANTO", label: "Adelanto de Sueldo",  desc: "Anticipo de haberes vía Pagos 360",    icono: <Zap size={22}/>,        color: "#10b981", visible: !!modulos.adelantos },
  ].filter(p => p.visible);

  const resetear = () => {
    setPaso("buscar"); setDni(""); setBcra(null); setJuicios(null); setNombreCliente("");
    setProducto(null); setMonto(""); setArchivos({ dniFrente: false, dniDorso: false, recibo: false });
    setStBcra("idle"); setStJuicios("idle"); setStCliente("idle"); setYaCliente(false);
    setStCuad("idle"); setCuadData(null); setSinInfoBcra(false); setOpcionesBcra([]);
    setSexo("M"); setCuil("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <Modal tipo={modal} bcra={bcra} juicios={juicios} onClose={() => setModal(null)}/>

      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">Nuevo Legajo</h1>
        <p className="text-gray-500 text-sm mt-1">
          {paso === "buscar"    && "Ingresá el DNI del cliente para comenzar"}
          {paso === "analizando"&& "Consultando BCRA, juicios y scoring..."}
          {paso === "resultado" && "Resultado del análisis de riesgo"}
          {paso === "producto"  && "Seleccioná el tipo de crédito"}
          {paso === "formulario"&& "Configurá el crédito"}
          {paso === "ok"        && "Operación guardada exitosamente"}
          {paso === "elegir_persona" && "Seleccioná la persona correcta"}
        </p>
      </div>

      {/* ELEGIR PERSONA */}
      {paso === "elegir_persona" && (
        <div className="space-y-4">
          <div className="bg-yellow-900/10 border border-yellow-900/40 rounded-2xl p-4">
            <p className="text-yellow-400 font-bold text-sm">Se encontraron dos personas con ese DNI</p>
            <p className="text-xs text-gray-500 mt-1">Seleccioná con cuál querés continuar</p>
          </div>
          {opcionesBcra.map((op: any, idx: number) => (
            <button key={op.cuil || idx} onClick={() => elegirPersona(op)}
              className="w-full bg-[#0A0A0A] border border-gray-900 hover:border-orange-500 rounded-2xl p-5 text-left transition-all">
              <p className="font-black text-white">{op.nombre}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">CUIL {op.cuil} · {op.sexo === "F" || op.cuil?.startsWith("27") ? "Femenino" : "Masculino"}</p>
              {op.tieneDeudas && <p className="text-xs text-red-400 mt-1">Situación {op.peorSituacion} · Con deudas</p>}
              {!op.tieneDeudas && <p className="text-xs text-green-400 mt-1">Situación {op.peorSituacion || 1} · Sin deudas</p>}
            </button>
          ))}
          <button onClick={resetear}
            className="w-full py-3 rounded-xl font-bold text-gray-500 hover:text-white text-sm flex items-center justify-center gap-2">
            <ArrowLeft size={14}/> Nueva consulta
          </button>
        </div>
      )}

      {/* BUSCAR */}
      {paso === "buscar" && (
        <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">DNI</label>
            <input type="number" value={dni} onChange={e => setDni(e.target.value)} placeholder="DNI sin puntos"
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white text-lg font-mono outline-none focus:border-orange-500"/>
          </div>

          <button onClick={evaluar} disabled={dni.length < 7}
            className="w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-30"
            style={{ backgroundColor: color }}>
            <Search size={16}/> Evaluar cliente
          </button>
        </div>
      )}

      {/* ANALIZANDO */}
      {paso === "analizando" && (
        <div className="space-y-3">
          <CardConsulta icono={<Building2 size={13}/>} titulo="Situación BCRA" status={stBcra}/>
          <CardConsulta icono={<Gavel size={13}/>}     titulo="Juicios / Concursos" status={stJuicios}/>
          <CardConsulta icono={<User size={13}/>}       titulo="Historial entidad" status={stCliente}/>
        </div>
      )}

      {/* RESULTADO */}
      {paso === "resultado" && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 border ${
            scoring === "APROBADO"  ? "bg-green-900/10 border-green-900/40" :
            scoring === "OBSERVADO" ? "bg-yellow-900/10 border-yellow-900/40" :
                                      "bg-red-900/10 border-red-900/40"}`}>
            <div className="flex items-center gap-3 mb-2">
              {scoring === "APROBADO"  && <CheckCircle2 size={22} className="text-green-400"/>}
              {scoring === "OBSERVADO" && <AlertTriangle size={22} className="text-yellow-400"/>}
              {scoring === "RECHAZADO" && <XCircle size={22} className="text-red-400"/>}
              <p className={`text-xl font-black ${scoring === "APROBADO" ? "text-green-400" : scoring === "OBSERVADO" ? "text-yellow-400" : "text-red-400"}`}>{scoring}</p>
            </div>
            {nombreCliente && <p className="text-white font-bold">{nombreCliente}</p>}
            <p className="text-gray-500 text-sm font-mono">DNI {dni} · CUIL {cuil}</p>
          </div>

          {/* Cards clicables */}
          <div className="grid grid-cols-1 gap-3">
            <CardConsulta
              icono={<Building2 size={13}/>} titulo="Situación BCRA" status={stBcra}
              resumen={sinInfoBcra ? "⬡ SIN INFORMACIÓN EN BCRA" : bcra ? `Situación ${bcra.peorSituacion} · ${bcra.tieneDeudas ? "Con deudas" : "Sin deudas"}${bcra.tieneChequesRechazados ? " · Cheques rechazados" : ""}` : undefined}
              sinInfo={sinInfoBcra}
              onClick={() => setModal("bcra")}
            />
            <CardConsulta
              icono={<Gavel size={13}/>} titulo="Juicios / Concursos" status={stJuicios}
              resumen={juicios ? `${juicios.registros?.length || 0} registro(s) encontrado(s)` : undefined}
              onClick={() => setModal("juicios")}
            />
            <CardConsulta
              icono={<User size={13}/>} titulo="Historial entidad" status={stCliente}
              resumen={yaCliente ? "Ya es cliente de la entidad" : "Cliente nuevo"}
            />
          </div>

          {scoring === "OBSERVADO" && (
            <p className="text-xs text-yellow-500 text-center bg-yellow-900/10 border border-yellow-900/30 rounded-xl p-3">
              El cliente tiene observaciones. Podés continuar pero el supervisor deberá aprobar.
            </p>
          )}

          {scoring !== "RECHAZADO" && (
            <button onClick={() => setPaso("producto")}
              className="w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: color }}>
              Continuar con el crédito <ChevronRight size={16}/>
            </button>
          )}
          <button onClick={resetear}
            className="w-full py-3 rounded-xl font-bold text-gray-500 hover:text-white text-sm flex items-center justify-center gap-2">
            <ArrowLeft size={14}/> Nueva consulta
          </button>
        </div>
      )}

      {/* PRODUCTO */}
      {paso === "producto" && (
        <div className="space-y-3">
          {productosDisponibles.map(p => (
            <button key={p.key} onClick={() => elegirProducto(p.key as Producto)}
              className="w-full bg-[#0A0A0A] border border-gray-900 hover:border-gray-600 rounded-2xl p-5 flex items-center gap-4 transition-all text-left">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${p.color}20`, color: p.color }}>{p.icono}</div>
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

      {/* FORMULARIO */}
      {paso === "formulario" && (
        <div className="space-y-4">
          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-4 flex items-center gap-3">
            <User size={16} className="text-gray-500"/>
            <div>
              <p className="text-white font-bold text-sm">{nombreCliente || `DNI ${dni}`}</p>
              <p className="text-xs text-gray-500">DNI {dni} · {producto === "PRIVADO" ? "Crédito Personal" : producto === "CUAD" ? "Descuento Haberes" : "Adelanto de Sueldo"}</p>
            </div>
          </div>

          {producto === "CUAD" && (
            <div className={`rounded-2xl p-4 border ${stCuad === "ok" ? "bg-green-900/10 border-green-900/40" : stCuad === "no_empleado" ? "bg-yellow-900/10 border-yellow-900/40" : stCuad === "procesando" ? "bg-gray-900/20 border-gray-800" : "bg-red-900/10 border-red-900/40"}`}>
              {stCuad === "procesando" && <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 size={13} className="animate-spin"/> Consultando cupo CUAD...</div>}
              {stCuad === "ok" && cuadData && <div><p className="text-green-400 font-black text-sm">Cupo CUAD disponible</p><p className="text-white font-mono text-xl font-black mt-1">{fmt(cuadData.maximo)}</p></div>}
              {stCuad === "no_empleado" && <p className="text-yellow-400 font-bold text-sm">No registra como empleado en el sistema CUAD</p>}
              {stCuad === "error" && <p className="text-red-400 font-bold text-sm">{cuadData?.errorMsg || "No se pudo consultar el sistema CUAD"}</p>}
            </div>
          )}

          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5 space-y-4">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Estructura del crédito</p>
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">Monto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="150000"
                  className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 pl-8 text-white text-lg font-mono outline-none focus:border-orange-500"/>
              </div>
            </div>
            {producto !== "ADELANTO" && (
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">Cuotas</label>
                <select value={cuotas} onChange={e => setCuotas(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white outline-none font-bold">
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

          <div className="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Documentación</p>
            {[{ key: "dniFrente", label: "DNI Frente" }, { key: "dniDorso", label: "DNI Dorso" }, { key: "recibo", label: "Recibo de Sueldo" }].map(d => (
              <button key={d.key} onClick={() => setArchivos(p => ({ ...p, [d.key]: !(p as any)[d.key] }))}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${(archivos as any)[d.key] ? "bg-green-900/20 border-green-900 text-green-400" : "bg-black border-gray-800 text-gray-500 hover:border-gray-600"}`}>
                <span className="font-bold flex items-center gap-2 text-sm"><FileText size={14}/>{d.label}</span>
                {(archivos as any)[d.key] ? <CheckCircle2 size={15}/> : <UploadCloud size={15}/>}
              </button>
            ))}
          </div>

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

      {/* OK */}
      {paso === "ok" && (
        <div className="bg-[#0A0A0A] border border-green-900/40 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="text-green-400 mx-auto"/>
          <p className="text-xl font-black text-white">Operación guardada</p>
          <p className="text-gray-500 text-sm">Estado: EN REVISIÓN · ID: {operacionId}</p>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard/aprobacion")}
              className="flex-1 py-3 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: color }}>
              Ver en aprobación
            </button>
            <button onClick={resetear}
              className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white border border-gray-800 text-sm">
              Nuevo legajo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
