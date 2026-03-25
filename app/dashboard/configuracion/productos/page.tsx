"use client";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Save, Loader2, CheckCircle2, Landmark, CreditCard, Zap,
  Info, AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";

type ProductoKey = "CUAD" | "PRIVADO" | "ADELANTO";

interface ConfigProducto {
  activo:              boolean;
  montoMinimo:         number;
  montoMaximo:         number;
  plazosDisponibles:   number[];
  tnaPropia:           number;   // TNA % para capital propio (sin fondeador)
  gastosOtorgamiento:  number;   // %
  seguroVida:          number;   // %
  porcMaxSueldo:       number;   // % (solo relevante para ADELANTO)
  autoAprobacion:      boolean;  // pasa directo a liquidar si scoring OK
  requiereOnboarding:  boolean;  // requiere DNI, selfie, firma
}

const DEFAULT_CONFIG: Record<ProductoKey, ConfigProducto> = {
  CUAD: {
    activo: true, montoMinimo: 10000, montoMaximo: 500000,
    plazosDisponibles: [6, 12, 18, 24], tnaPropia: 80,
    gastosOtorgamiento: 5, seguroVida: 1.5, porcMaxSueldo: 0,
    autoAprobacion: false, requiereOnboarding: true,
  },
  PRIVADO: {
    activo: true, montoMinimo: 10000, montoMaximo: 1000000,
    plazosDisponibles: [3, 6, 9, 12, 18, 24, 36], tnaPropia: 120,
    gastosOtorgamiento: 8, seguroVida: 2, porcMaxSueldo: 0,
    autoAprobacion: false, requiereOnboarding: true,
  },
  ADELANTO: {
    activo: true, montoMinimo: 5000, montoMaximo: 300000,
    plazosDisponibles: [1, 3], tnaPropia: 60,
    gastosOtorgamiento: 3, seguroVida: 0, porcMaxSueldo: 30,
    autoAprobacion: true, requiereOnboarding: false,
  },
};

const PRODUCTOS_INFO: { key: ProductoKey; label: string; desc: string; icon: any; color: string }[] = [
  { key: "CUAD",     label: "Descuento por Haberes (CUAD)", desc: "Créditos con descuento por nómina del gobierno",  icon: Landmark,   color: "#8b5cf6" },
  { key: "PRIVADO",  label: "Crédito Personal",             desc: "Préstamos personales con cuotas fijas",           icon: CreditCard, color: "#3b82f6" },
  { key: "ADELANTO", label: "Adelanto de Sueldo",           desc: "Anticipo de haberes, cobro vía Pagos 360",       icon: Zap,        color: "#10b981" },
];

const PLAZOS_OPCIONES = [1, 3, 6, 9, 12, 18, 24, 36, 48];

export default function ConfigProductosPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [configs, setConfigs] = useState<Record<ProductoKey, ConfigProducto>>({ ...DEFAULT_CONFIG });
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);
  const [expandido, setExpandido] = useState<ProductoKey | null>("CUAD");

  const modulos = entidadData?.modulosHabilitados || {};
  const puedeEditar = ["GERENTE_GENERAL", "MASTER_PAYSUR"].includes(userData?.rol || "");

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      try {
        const snap = await getDoc(doc(db, "entidades", entidadData.id));
        const saved = snap.data()?.configuracion?.productos;
        if (saved) {
          setConfigs(prev => ({
            CUAD:     { ...prev.CUAD,     ...saved.CUAD },
            PRIVADO:  { ...prev.PRIVADO,  ...saved.PRIVADO },
            ADELANTO: { ...prev.ADELANTO, ...saved.ADELANTO },
          }));
        }
      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    };
    cargar();
  }, [entidadData]);

  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.productos": configs,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  const setVal = (producto: ProductoKey, key: keyof ConfigProducto, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [producto]: { ...prev[producto], [key]: value },
    }));
  };

  const togglePlazo = (producto: ProductoKey, plazo: number) => {
    const current = configs[producto].plazosDisponibles;
    const next = current.includes(plazo)
      ? current.filter(p => p !== plazo)
      : [...current, plazo].sort((a, b) => a - b);
    setVal(producto, "plazosDisponibles", next);
  };

  // Preview de cuota
  const calcCuota = (cfg: ConfigProducto, monto: number, cuotas: number) => {
    const tem = (cfg.tnaPropia / 100) / 12;
    if (tem === 0 || cuotas === 0) return 0;
    const cuotaPura = (monto * tem * Math.pow(1 + tem, cuotas)) / (Math.pow(1 + tem, cuotas) - 1);
    const extras = (monto * (cfg.gastosOtorgamiento / 100) + monto * (cfg.seguroVida / 100)) / cuotas;
    return Math.round(cuotaPura + extras);
  };

  if (cargando) return (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Productos</h1>
          <p className="text-gray-500 text-sm mt-1">Condiciones por línea de crédito</p>
        </div>
        {puedeEditar && (
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-50"
            style={{ backgroundColor: colorPrimario }}>
            {guardando ? <Loader2 size={15} className="animate-spin" /> :
             guardado  ? <><CheckCircle2 size={15} /> Guardado</> :
                         <><Save size={15} /> Guardar</>}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-900/10 border border-blue-900/30 rounded-2xl p-4">
        <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-300">
          Cada producto tiene sus propias condiciones. Los fondeadores se asignan por separado en
          <strong> Configuración → Fondeadores</strong> y filtran automáticamente según el producto.
        </p>
      </div>

      {/* Productos */}
      {PRODUCTOS_INFO.map(prod => {
        const cfg = configs[prod.key];
        const habilitado = modulos[prod.key.toLowerCase()] || modulos[prod.key === "PRIVADO" ? "privados" : prod.key === "CUAD" ? "cuad" : "adelantos"];
        const abierto = expandido === prod.key;
        const Icon = prod.icon;

        // Preview
        const montoEj = Math.round((cfg.montoMinimo + cfg.montoMaximo) / 2 / 1000) * 1000;
        const cuotasEj = cfg.plazosDisponibles[Math.floor(cfg.plazosDisponibles.length / 2)] || 12;
        const cuotaEj = calcCuota(cfg, montoEj, cuotasEj);

        return (
          <div key={prod.key}
            className={`bg-[#0A0A0A] border rounded-2xl overflow-hidden transition-all ${
              !habilitado ? "opacity-40 border-gray-900" : "border-gray-800"
            }`}>

            {/* Header del producto */}
            <button onClick={() => setExpandido(abierto ? null : prod.key)}
              className="w-full flex items-center justify-between p-5 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${prod.color}20`, color: prod.color }}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-black text-white text-sm">{prod.label}</p>
                  <p className="text-xs text-gray-500">{prod.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!habilitado && (
                  <span className="text-[9px] text-yellow-500 uppercase font-bold bg-yellow-900/20 px-2 py-1 rounded">No habilitado</span>
                )}
                {habilitado && cuotaEj > 0 && (
                  <span className="text-xs text-gray-500 font-mono">
                    ej: ${montoEj.toLocaleString("es-AR")} en {cuotasEj}c = ${cuotaEj.toLocaleString("es-AR")}/mes
                  </span>
                )}
                {abierto ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </div>
            </button>

            {/* Contenido expandido */}
            {abierto && habilitado && (
              <div className="border-t border-gray-800 p-5 space-y-5">

                {/* Activo */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Producto activo</p>
                    <p className="text-xs text-gray-500">Los vendedores pueden originar este producto</p>
                  </div>
                  <button onClick={() => setVal(prod.key, "activo", !cfg.activo)} disabled={!puedeEditar}
                    className={`w-10 h-5 rounded-full transition-colors ${cfg.activo ? "bg-green-500" : "bg-gray-700"}`}>
                    <span className={`block w-4 h-4 mt-0.5 bg-white rounded-full shadow transition-all ${cfg.activo ? "ml-5" : "ml-0.5"}`} />
                  </button>
                </div>

                {/* Montos */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Montos</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Mínimo ($)</label>
                      <input type="number" value={cfg.montoMinimo} disabled={!puedeEditar}
                        onChange={e => setVal(prod.key, "montoMinimo", parseInt(e.target.value) || 0)}
                        className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Máximo ($)</label>
                      <input type="number" value={cfg.montoMaximo} disabled={!puedeEditar}
                        onChange={e => setVal(prod.key, "montoMaximo", parseInt(e.target.value) || 0)}
                        className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50" />
                    </div>
                  </div>
                </div>

                {/* Plazos */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Plazos disponibles</p>
                  <div className="flex flex-wrap gap-2">
                    {PLAZOS_OPCIONES.map(p => (
                      <button key={p} onClick={() => puedeEditar && togglePlazo(prod.key, p)}
                        disabled={!puedeEditar}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 ${
                          cfg.plazosDisponibles.includes(p)
                            ? "border-green-700 bg-green-900/30 text-green-400"
                            : "border-gray-700 text-gray-500 hover:text-white"
                        }`}>
                        {p} {p === 1 ? "cuota" : "cuotas"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tasas */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Tasas y gastos</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">TNA propia (%)</label>
                      <input type="number" step={0.5} value={cfg.tnaPropia} disabled={!puedeEditar}
                        onChange={e => setVal(prod.key, "tnaPropia", parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Gastos otorg. (%)</label>
                      <input type="number" step={0.1} value={cfg.gastosOtorgamiento} disabled={!puedeEditar}
                        onChange={e => setVal(prod.key, "gastosOtorgamiento", parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Seguro vida (%)</label>
                      <input type="number" step={0.1} value={cfg.seguroVida} disabled={!puedeEditar}
                        onChange={e => setVal(prod.key, "seguroVida", parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50" />
                    </div>
                  </div>
                </div>

                {/* % Máximo del sueldo (solo adelantos) */}
                {prod.key === "ADELANTO" && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Límite por sueldo</p>
                    <div className="flex items-center gap-3">
                      <input type="number" step={1} min={1} max={100} value={cfg.porcMaxSueldo} disabled={!puedeEditar}
                        onChange={e => setVal(prod.key, "porcMaxSueldo", parseInt(e.target.value) || 0)}
                        className="w-24 bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50" />
                      <p className="text-xs text-gray-500">% máximo del sueldo neto que se puede adelantar</p>
                    </div>
                  </div>
                )}

                {/* Opciones */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Opciones</p>
                  <div className="space-y-3">
                    {/* Auto-aprobación */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">Auto-aprobación</p>
                        <p className="text-xs text-gray-500">Si scoring aprueba, pasa directo a liquidar (sin verificación manual)</p>
                      </div>
                      <button onClick={() => puedeEditar && setVal(prod.key, "autoAprobacion", !cfg.autoAprobacion)}
                        disabled={!puedeEditar}
                        className={`w-10 h-5 rounded-full transition-colors ${cfg.autoAprobacion ? "bg-green-500" : "bg-gray-700"}`}>
                        <span className={`block w-4 h-4 mt-0.5 bg-white rounded-full shadow transition-all ${cfg.autoAprobacion ? "ml-5" : "ml-0.5"}`} />
                      </button>
                    </div>

                    {/* Requiere onboarding */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">Requiere onboarding digital</p>
                        <p className="text-xs text-gray-500">El cliente debe completar DNI, selfie y firma antes de aprobar</p>
                      </div>
                      <button onClick={() => puedeEditar && setVal(prod.key, "requiereOnboarding", !cfg.requiereOnboarding)}
                        disabled={!puedeEditar}
                        className={`w-10 h-5 rounded-full transition-colors ${cfg.requiereOnboarding ? "bg-green-500" : "bg-gray-700"}`}>
                        <span className={`block w-4 h-4 mt-0.5 bg-white rounded-full shadow transition-all ${cfg.requiereOnboarding ? "ml-5" : "ml-0.5"}`} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Mensaje si no habilitado */}
            {abierto && !habilitado && (
              <div className="border-t border-gray-800 p-5">
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertTriangle size={14} />
                  <span>Este módulo no está habilitado. Contactá a Paysur para activarlo.</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
