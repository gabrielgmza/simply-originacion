"use client";
import { useState, useEffect, useMemo } from "react";
import { doc, updateDoc, getDoc, collection, addDoc, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Save, Loader2, CheckCircle2, Plus, Trash2,
  Percent, Banknote, Calculator, Building2, ChevronDown, ChevronUp
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Parametros {
  tna: number;
  cft: number;
  gastosOtorgamiento: number;   // % sobre el monto
  seguroVida: number;           // % sobre el monto
  comisionVendedor: number;     // % sobre el monto
  montoMinimo: number;
  montoMaximo: number;
  plazosDisponibles: number[];  // ej: [3, 6, 12, 18, 24]
}

interface Fondeador {
  id?: string;
  nombre: string;
  tna: number;
  plazoMaximo: number;
  montoMaximo: number;
  activo: boolean;
  entidadId: string;
}

const PLAZOS_OPCIONES = [1, 3, 6, 9, 12, 18, 24, 36];

// ─── CALCULADORA HELPER ───────────────────────────────────────────────────────
function calcularCuota(monto: number, cuotas: number, tna: number, gastos: number, seguro: number): number {
  if (!monto || !cuotas || !tna) return 0;
  const tasaMensual = tna / 100 / 12;
  const cuotaPura = tasaMensual === 0
    ? monto / cuotas
    : (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -cuotas));
  const extras = (monto * (gastos / 100) + monto * (seguro / 100)) / cuotas;
  return Math.round(cuotaPura + extras);
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const { entidadData, userData } = useAuth();
  const [params, setParams] = useState<Parametros>({
    tna: 120, cft: 0, gastosOtorgamiento: 5, seguroVida: 1.5,
    comisionVendedor: 1, montoMinimo: 10000, montoMaximo: 500000,
    plazosDisponibles: [3, 6, 12, 18, 24],
  });
  const [fondeadores, setFondeadores] = useState<Fondeador[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simulador
  const [simMonto, setSimMonto] = useState(100000);
  const [simCuotas, setSimCuotas] = useState(12);

  // Nuevo fondeador
  const [nuevoFond, setNuevoFond] = useState<Omit<Fondeador, "id" | "entidadId">>({
    nombre: "", tna: 100, plazoMaximo: 24, montoMaximo: 500000, activo: true
  });
  const [guardandoFond, setGuardandoFond] = useState(false);
  const [mostrarFondForm, setMostrarFondForm] = useState(false);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // ── Cargar parámetros ──
  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "entidades", entidadData.id));
        if (snap.exists()) {
          const data = snap.data();
          if (data.parametros) setParams({ ...params, ...data.parametros });
        }
        // Fondeadores
        const fondSnap = await getDocs(
          query(collection(db, "fondeadores"), where("entidadId", "==", entidadData.id))
        );
        setFondeadores(fondSnap.docs.map(d => ({ id: d.id, ...d.data() } as Fondeador)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    cargar();
  }, [entidadData]);

  // ── Guardar parámetros ──
  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "parametros": params,
        // También sincronizamos con configuracion para compatibilidad
        "configuracion.tasaInteresBase": params.tna,
        "configuracion.gastosOtorgamiento": params.gastosOtorgamiento,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  // ── Toggle plazo ──
  const togglePlazo = (p: number) => {
    setParams(prev => ({
      ...prev,
      plazosDisponibles: prev.plazosDisponibles.includes(p)
        ? prev.plazosDisponibles.filter(x => x !== p)
        : [...prev.plazosDisponibles, p].sort((a, b) => a - b)
    }));
  };

  // ── Agregar fondeador ──
  const agregarFondeador = async () => {
    if (!nuevoFond.nombre) { alert("Ingresá el nombre del fondeador."); return; }
    setGuardandoFond(true);
    try {
      const ref = await addDoc(collection(db, "fondeadores"), {
        ...nuevoFond, entidadId: entidadData?.id,
      });
      setFondeadores(prev => [...prev, { id: ref.id, ...nuevoFond, entidadId: entidadData?.id || "" }]);
      setNuevoFond({ nombre: "", tna: 100, plazoMaximo: 24, montoMaximo: 500000, activo: true });
      setMostrarFondForm(false);
    } catch { alert("Error al guardar el fondeador."); }
    finally { setGuardandoFond(false); }
  };

  // ── Eliminar fondeador ──
  const eliminarFondeador = async (id: string) => {
    if (!confirm("¿Eliminar este fondeador?")) return;
    await deleteDoc(doc(db, "fondeadores", id));
    setFondeadores(prev => prev.filter(f => f.id !== id));
  };

  // ── Toggle activo fondeador ──
  const toggleFondeador = async (f: Fondeador) => {
    if (!f.id) return;
    await updateDoc(doc(db, "fondeadores", f.id), { activo: !f.activo });
    setFondeadores(prev => prev.map(x => x.id === f.id ? { ...x, activo: !x.activo } : x));
  };

  // ── Simulador ──
  const cuotaSimulada = useMemo(() =>
    calcularCuota(simMonto, simCuotas, params.tna, params.gastosOtorgamiento, params.seguroVida),
    [simMonto, simCuotas, params.tna, params.gastosOtorgamiento, params.seguroVida]
  );
  const totalSimulado = cuotaSimulada * simCuotas;
  const cftCalculado = simMonto > 0
    ? (((totalSimulado - simMonto) / simMonto) * 100).toFixed(1) : "0";

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
  );

  const inputClass = "w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gray-500";
  const labelClass = "block text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-bold";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Configuración</h1>
          <p className="text-gray-500 text-sm mt-1">Tasas, parámetros y fondeadores de tu entidad</p>
        </div>
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          style={{ backgroundColor: colorPrimario }}>
          {guardando ? <Loader2 size={16} className="animate-spin" /> :
           guardado ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {guardado ? "¡Guardado!" : "Guardar"}
        </button>
      </div>

      {/* ── BLOQUE 1: TASAS ── */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Percent size={18} style={{ color: colorPrimario }} />
          <h2 className="font-black text-white uppercase tracking-widest text-sm">Tasas e Intereses</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "TNA (%)", key: "tna", step: 0.1 },
            { label: "Gastos Otorg. (%)", key: "gastosOtorgamiento", step: 0.1 },
            { label: "Seguro de Vida (%)", key: "seguroVida", step: 0.01 },
            { label: "Comisión Vendedor (%)", key: "comisionVendedor", step: 0.1 },
          ].map(({ label, key, step }) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input type="number" step={step} min={0}
                value={(params as any)[key]}
                onChange={e => setParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                className={inputClass} />
            </div>
          ))}
        </div>
      </div>

      {/* ── BLOQUE 2: MONTOS Y PLAZOS ── */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Banknote size={18} style={{ color: colorPrimario }} />
          <h2 className="font-black text-white uppercase tracking-widest text-sm">Montos y Plazos</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className={labelClass}>Monto mínimo ($)</label>
            <input type="number" value={params.montoMinimo} min={0}
              onChange={e => setParams(prev => ({ ...prev, montoMinimo: parseInt(e.target.value) || 0 }))}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Monto máximo ($)</label>
            <input type="number" value={params.montoMaximo} min={0}
              onChange={e => setParams(prev => ({ ...prev, montoMaximo: parseInt(e.target.value) || 0 }))}
              className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Plazos disponibles (cuotas)</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PLAZOS_OPCIONES.map(p => (
              <button key={p} onClick={() => togglePlazo(p)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  params.plazosDisponibles.includes(p)
                    ? "text-white border-transparent"
                    : "text-gray-500 border-gray-700 hover:border-gray-500"
                }`}
                style={params.plazosDisponibles.includes(p) ? { backgroundColor: colorPrimario } : {}}>
                {p}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">Seleccionados: {params.plazosDisponibles.join(", ")} cuotas</p>
        </div>
      </div>

      {/* ── BLOQUE 3: SIMULADOR ── */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Calculator size={18} style={{ color: colorPrimario }} />
          <h2 className="font-black text-white uppercase tracking-widest text-sm">Simulador en tiempo real</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className={labelClass}>Monto a simular ($)</label>
            <input type="number" value={simMonto} step={5000}
              onChange={e => setSimMonto(parseInt(e.target.value) || 0)}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cuotas</label>
            <select value={simCuotas} onChange={e => setSimCuotas(parseInt(e.target.value))}
              className={inputClass}>
              {params.plazosDisponibles.map(p => <option key={p} value={p}>{p} cuotas</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Cuota mensual</p>
            <p className="text-2xl font-black text-white">${cuotaSimulada.toLocaleString("es-AR")}</p>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Total a pagar</p>
            <p className="text-2xl font-black text-white">${totalSimulado.toLocaleString("es-AR")}</p>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">CFT estimado</p>
            <p className="text-2xl font-black" style={{ color: colorPrimario }}>{cftCalculado}%</p>
          </div>
        </div>
      </div>

      {/* ── BLOQUE 4: FONDEADORES ── */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Building2 size={18} style={{ color: colorPrimario }} />
            <h2 className="font-black text-white uppercase tracking-widest text-sm">Fondeadores</h2>
          </div>
          <button onClick={() => setMostrarFondForm(!mostrarFondForm)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors text-white"
            style={{ backgroundColor: colorPrimario }}>
            <Plus size={14} /> Agregar
          </button>
        </div>

        {/* Form nuevo fondeador */}
        {mostrarFondForm && (
          <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Nombre del fondeador</label>
                <input placeholder="Ej: Banco Nación, FCI Inversiones..." value={nuevoFond.nombre}
                  onChange={e => setNuevoFond(p => ({ ...p, nombre: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>TNA (%)</label>
                <input type="number" value={nuevoFond.tna} step={0.1}
                  onChange={e => setNuevoFond(p => ({ ...p, tna: parseFloat(e.target.value) || 0 }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Plazo máx. (cuotas)</label>
                <input type="number" value={nuevoFond.plazoMaximo}
                  onChange={e => setNuevoFond(p => ({ ...p, plazoMaximo: parseInt(e.target.value) || 0 }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Monto máximo ($)</label>
                <input type="number" value={nuevoFond.montoMaximo}
                  onChange={e => setNuevoFond(p => ({ ...p, montoMaximo: parseInt(e.target.value) || 0 }))}
                  className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setMostrarFondForm(false)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={agregarFondeador} disabled={guardandoFond}
                className="flex-1 py-2 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                style={{ backgroundColor: colorPrimario }}>
                {guardandoFond ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Lista de fondeadores */}
        {fondeadores.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Sin fondeadores configurados. El sistema usará capital propio.</p>
        ) : (
          <div className="space-y-2">
            {/* Capital propio siempre primero */}
            <div className="flex items-center justify-between bg-gray-900/30 p-4 rounded-xl border border-gray-800">
              <div>
                <p className="text-sm font-bold text-white">Capital Propio (Entidad)</p>
                <p className="text-xs text-gray-500">TNA {params.tna}% · Siempre disponible</p>
              </div>
              <span className="text-xs font-bold text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-800/50">Activo</span>
            </div>

            {fondeadores.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                <div>
                  <p className="text-sm font-bold text-white">{f.nombre}</p>
                  <p className="text-xs text-gray-500">TNA {f.tna}% · hasta {f.plazoMaximo} cuotas · máx ${f.montoMaximo.toLocaleString("es-AR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleFondeador(f)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                      f.activo
                        ? "bg-green-900/30 text-green-400 border-green-800/50 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800/50"
                        : "bg-gray-800 text-gray-500 border-gray-700 hover:bg-green-900/30 hover:text-green-400 hover:border-green-800/50"
                    }`}>
                    {f.activo ? "Activo" : "Inactivo"}
                  </button>
                  <button onClick={() => f.id && eliminarFondeador(f.id)}
                    className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/20">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
