"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Calculator, Landmark, ChevronRight, Share2,
  Loader2, CheckCircle2, DollarSign, Percent,
  FileText, AlertCircle, Info
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Fondeador {
  id: string;
  nombre: string;
  tna: number;
  plazoMaximo: number;
  montoMaximo: number;
  activo: boolean;
}

interface Resultado {
  fondeadorId: string;
  nombre: string;
  tna: number;
  cuotaPura: number;
  costoSeguro: number;
  costoGastos: number;
  cuotaTotal: number;
  totalDevolver: number;
  totalIntereses: number;
  gastosOtorgamiento: number;
  capitalNeto: number;
  cft: number;
}

// ─── CÁLCULO SISTEMA FRANCÉS ──────────────────────────────────────────────────
function calcularCuota(monto: number, tna: number, cuotas: number): number {
  const tem = tna / 100 / 12;
  if (tem === 0) return monto / cuotas;
  return (monto * tem * Math.pow(1 + tem, cuotas)) / (Math.pow(1 + tem, cuotas) - 1);
}

function calcularResultado(
  monto: number,
  cuotas: number,
  fondeador: { id: string; nombre: string; tna: number },
  config: any
): Resultado {
  const tna               = fondeador.tna;
  const cuotaPura         = calcularCuota(monto, tna, cuotas);
  const gastosPorc        = config.gastosOtorgamientoPorc || config.gastosOtorgamiento || 0;
  const seguroPorc        = config.seguroVidaPorc || config.seguroVida || 0;

  const gastosOtorgamiento = (monto * gastosPorc) / 100;
  const capitalNeto        = monto - gastosOtorgamiento;
  const costoSeguro        = (monto * seguroPorc) / 100 / cuotas;
  const costoGastos        = gastosOtorgamiento / cuotas;
  const cuotaTotal         = cuotaPura + costoSeguro + costoGastos;
  const totalDevolver      = cuotaTotal * cuotas;
  const totalIntereses     = totalDevolver - monto;
  const cft                = totalDevolver > 0
    ? (Math.pow(totalDevolver / monto, 12 / cuotas) - 1) * 100
    : 0;

  return {
    fondeadorId: fondeador.id,
    nombre: fondeador.nombre,
    tna,
    cuotaPura,
    costoSeguro,
    costoGastos,
    cuotaTotal,
    totalDevolver,
    totalIntereses,
    gastosOtorgamiento,
    capitalNeto,
    cft,
  };
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
const fmtPct = (n: number) => n.toFixed(2) + "%";

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export default function SimuladorPage() {
  const { entidadData, userData } = useAuth();
  const router = useRouter();

  const [config, setConfig]             = useState<any>(null);
  const [fondeadores, setFondeadores]   = useState<Fondeador[]>([]);
  const [loading, setLoading]           = useState(true);

  const [monto, setMonto]               = useState<number>(100000);
  const [montoInput, setMontoInput]     = useState("100000");
  const [cuotas, setCuotas]             = useState<number>(12);
  const [fondeadorId, setFondeadorId]   = useState<string>("propio");
  const [compartiendo, setCompartiendo] = useState(false);
  const [telefonoWA, setTelefonoWA]     = useState("");
  const [mostrarWA, setMostrarWA]       = useState(false);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // ── Cargar config y fondeadores ──
  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      try {
        const entSnap = await getDoc(doc(db, "entidades", entidadData.id));
        const cfg = entSnap.data()?.configuracion || entSnap.data()?.parametros || {};
        setConfig(cfg);

        const snap = await getDocs(
          query(collection(db, "fondeadores"),
            where("entidadId", "==", entidadData.id),
            where("activo", "==", true))
        );
        setFondeadores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fondeador)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    cargar();
  }, [entidadData]);

  // ── Opciones de fondeadores (capital propio + externos) ──
  const opciones = useMemo(() => {
    if (!config) return [];
    return [
      {
        id: "propio",
        nombre: "Capital Propio",
        tna: config.tasaInteresBase || config.tna || 0,
        plazoMaximo: 36,
        montoMaximo: 9999999,
        activo: true,
      },
      ...fondeadores,
    ];
  }, [config, fondeadores]);

  // ── Plazos disponibles de la entidad ──
  const plazosDisponibles: number[] = useMemo(() => {
    const pl = config?.plazosDisponibles;
    if (Array.isArray(pl) && pl.length > 0) return pl;
    return [3, 6, 9, 12, 18, 24, 36];
  }, [config]);

  // ── Fondeador seleccionado ──
  const fondeadorActual = opciones.find(o => o.id === fondeadorId) || opciones[0];

  // ── Resultado calculado ──
  const resultado: Resultado | null = useMemo(() => {
    if (!config || !fondeadorActual || monto <= 0 || cuotas <= 0) return null;
    return calcularResultado(monto, cuotas, fondeadorActual, config);
  }, [monto, cuotas, fondeadorActual, config]);

  // ── Validaciones ──
  const montoMin = config?.montoMinimo || 0;
  const montoMax = fondeadorActual?.montoMaximo || config?.montoMaximo || 9999999;
  const errorMonto = monto < montoMin
    ? `Monto mínimo: ${fmt(montoMin)}`
    : monto > montoMax
    ? `Monto máximo: ${fmt(montoMax)}`
    : null;

  // ── Crear legajo ──
  const crearLegajo = () => {
    if (!resultado) return;
    const params = new URLSearchParams({
      monto:       String(monto),
      cuotas:      String(cuotas),
      fondeador:   fondeadorActual?.nombre || "",
      tna:         String(resultado.tna),
      cuota:       String(Math.round(resultado.cuotaTotal)),
    });
    router.push(`/dashboard/originacion?${params.toString()}`);
  };

  // ── Compartir por WhatsApp ──
  const compartirWA = async () => {
    if (!resultado || !telefonoWA) return;
    setCompartiendo(true);
    try {
      const texto = encodeURIComponent(
        `💰 *Simulación de Crédito - ${entidadData?.nombreFantasia}*\n\n` +
        `Monto solicitado: ${fmt(monto)}\n` +
        `Cuotas: ${cuotas} de ${fmt(resultado.cuotaTotal)}\n` +
        `Total a devolver: ${fmt(resultado.totalDevolver)}\n` +
        `TNA: ${fmtPct(resultado.tna)} | CFT: ${fmtPct(resultado.cft)}\n\n` +
        `Para avanzar con tu crédito, contactate con nosotros.`
      );
      const tel = telefonoWA.replace(/\D/g, "");
      window.open(`https://wa.me/${tel}?text=${texto}`, "_blank");
      setMostrarWA(false);
      setTelefonoWA("");
    } finally {
      setCompartiendo(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-gray-500" size={32} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">

      {/* ENCABEZADO */}
      <div>
        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Simulador</h1>
        <p className="text-gray-500 text-sm mt-1">Calculá cuotas y compartí con el cliente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── PANEL IZQUIERDO: INPUTS ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Monto */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
              Monto solicitado
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                value={montoInput}
                onChange={e => {
                  setMontoInput(e.target.value);
                  const n = parseFloat(e.target.value);
                  if (!isNaN(n)) setMonto(n);
                }}
                className="w-full bg-[#111] border border-gray-700 rounded-xl pl-8 pr-4 py-3 text-white text-xl font-black focus:outline-none focus:border-gray-500"
              />
            </div>
            {errorMonto && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle size={11} /> {errorMonto}
              </p>
            )}
            {/* Slider */}
            <input type="range"
              min={montoMin || 10000} max={montoMax} step={5000}
              value={monto}
              onChange={e => { setMonto(Number(e.target.value)); setMontoInput(e.target.value); }}
              className="w-full mt-3 accent-current"
              style={{ accentColor: colorPrimario }}
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>{fmt(montoMin || 10000)}</span>
              <span>{fmt(montoMax)}</span>
            </div>
          </div>

          {/* Cuotas */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
              Plazo
            </label>
            <div className="flex flex-wrap gap-2">
              {plazosDisponibles.map(p => (
                <button key={p} onClick={() => setCuotas(p)}
                  className="px-3 py-2 rounded-xl text-sm font-bold border transition-all"
                  style={cuotas === p
                    ? { backgroundColor: colorPrimario, borderColor: colorPrimario, color: "#fff" }
                    : { backgroundColor: "transparent", borderColor: "#374151", color: "#9ca3af" }}>
                  {p}c
                </button>
              ))}
            </div>
          </div>

          {/* Fondeador */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
            <label className="block text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
              Fondeador
            </label>
            <div className="space-y-2">
              {opciones.map(o => (
                <button key={o.id} onClick={() => setFondeadorId(o.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm ${
                    fondeadorId === o.id
                      ? "border-opacity-50"
                      : "border-gray-800 hover:bg-white/[0.02]"
                  }`}
                  style={fondeadorId === o.id
                    ? { borderColor: `${colorPrimario}66`, backgroundColor: `${colorPrimario}11` }
                    : {}}>
                  <div className="flex items-center gap-2">
                    <Landmark size={15} className={fondeadorId === o.id ? "" : "text-gray-600"}
                      style={fondeadorId === o.id ? { color: colorPrimario } : {}} />
                    <span className={fondeadorId === o.id ? "text-white font-bold" : "text-gray-400"}>
                      {o.nombre}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{o.tna}% TNA</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO: RESULTADO ── */}
        <div className="lg:col-span-3 space-y-4">
          {!resultado || errorMonto ? (
            <div className="h-full border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center py-20 text-gray-600">
              <Calculator size={36} className="mb-3 opacity-20" />
              <p className="text-sm">Completá los datos para ver la simulación</p>
            </div>
          ) : (
            <>
              {/* CUOTA DESTACADA */}
              <div className="bg-[#0A0A0A] border rounded-2xl p-6 text-center"
                style={{ borderColor: `${colorPrimario}44` }}>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Cuota mensual</p>
                <p className="text-5xl font-black text-white">{fmt(resultado.cuotaTotal)}</p>
                <p className="text-sm text-gray-500 mt-1">{cuotas} cuotas · {fondeadorActual?.nombre}</p>
              </div>

              {/* DESGLOSE */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Desglose de la cuota</p>
                <div className="space-y-2.5">
                  {[
                    { label: "Capital amortizado",       valor: resultado.cuotaPura - (resultado.cuotaPura - (monto / cuotas)), color: "text-white" },
                    { label: "Intereses (TNA " + fmtPct(resultado.tna) + ")", valor: resultado.cuotaPura - (monto / cuotas), color: "text-yellow-400" },
                    { label: "Gastos de otorgamiento",   valor: resultado.costoGastos,  color: "text-orange-400" },
                    { label: "Seguro de vida",            valor: resultado.costoSeguro,  color: "text-blue-400" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{row.label}</span>
                      <span className={`text-sm font-bold ${row.color}`}>{fmt(row.valor)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-800 pt-2 flex justify-between">
                    <span className="text-xs font-bold text-gray-300">Total cuota</span>
                    <span className="font-black text-white">{fmt(resultado.cuotaTotal)}</span>
                  </div>
                </div>
              </div>

              {/* TOTALES Y TASAS */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Monto acreditado",  valor: fmt(resultado.capitalNeto),     sub: "Descontados gastos" },
                  { label: "Total a devolver",  valor: fmt(resultado.totalDevolver),   sub: `${cuotas} cuotas de ${fmt(resultado.cuotaTotal)}` },
                  { label: "Total intereses",   valor: fmt(resultado.totalIntereses),  sub: "Costo financiero" },
                  { label: "CFT estimado",       valor: fmtPct(resultado.cft),          sub: "Costo financiero total" },
                ].map((k, i) => (
                  <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">{k.label}</p>
                    <p className="font-black text-white text-base">{k.valor}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* ACCIONES */}
              <div className="flex gap-3">
                <button onClick={crearLegajo}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: colorPrimario }}>
                  <FileText size={16} /> Crear legajo
                </button>
                <button onClick={() => setMostrarWA(!mostrarWA)}
                  className="flex items-center gap-2 px-5 py-3.5 font-bold rounded-xl border border-gray-700 text-gray-300 hover:bg-white/[0.04] transition-all">
                  <Share2 size={16} /> WhatsApp
                </button>
              </div>

              {/* INPUT WHATSAPP */}
              {mostrarWA && (
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 flex gap-3 animate-in fade-in duration-200">
                  <input
                    value={telefonoWA}
                    onChange={e => setTelefonoWA(e.target.value)}
                    placeholder="Número del cliente (549261XXXXXXX)"
                    className="flex-1 bg-[#111] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                  />
                  <button onClick={compartirWA} disabled={compartiendo || !telefonoWA}
                    className="px-4 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-colors"
                    style={{ backgroundColor: "#25D366" }}>
                    {compartiendo ? <Loader2 size={15} className="animate-spin" /> : "Enviar"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
