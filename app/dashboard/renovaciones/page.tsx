"use client";
// app/dashboard/renovaciones/page.tsx
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import SimuladorFinanciero from "@/app/dashboard/originacion/SimuladorFinanciero";
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Search, FileText, ChevronRight,
  Download, ArrowRight, Landmark, RotateCcw
} from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

type Paso = "lista" | "elegibilidad" | "simulador" | "confirmar" | "resultado";

export default function RenovacionesPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [ops,         setOps]         = useState<any[]>([]);
  const [cargando,    setCargando]    = useState(true);
  const [busqueda,    setBusqueda]    = useState("");

  // Flujo
  const [paso,        setPaso]        = useState<Paso>("lista");
  const [opSel,       setOpSel]       = useState<any>(null);        // operación origen seleccionada
  const [elegibilidad,setElegibilidad]= useState<any>(null);
  const [cargandoEleg,setCargandoEleg]= useState(false);

  // Nuevo crédito
  const [nuevoMonto,  setNuevoMonto]  = useState("");
  const [nuevasCuotas,setNuevasCuotas]= useState("12");
  const [ofertaSel,   setOfertaSel]   = useState<any>(null);

  // Resultado
  const [procesando,  setProcesando]  = useState(false);
  const [resultado,   setResultado]   = useState<any>(null);

  // WhatsApp elegibles
  const [enviandoWS,  setEnviandoWS]  = useState(false);

  const cargar = async () => {
    if (!entidadData?.id) return;
    setCargando(true);
    const snap = await getDocs(
      query(collection(db, "operaciones"),
        where("entidadId", "==", entidadData.id),
        where("estado",    "in", ["LIQUIDADO","FINALIZADO"]))
    );
    setOps(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [entidadData]);

  const opsFiltradas = useMemo(() => {
    if (!busqueda) return ops;
    const b = busqueda.toLowerCase();
    return ops.filter(o =>
      o.cliente?.nombre?.toLowerCase().includes(b) ||
      o.cliente?.dni?.includes(b)
    );
  }, [ops, busqueda]);

  // Verificar elegibilidad de la op seleccionada
  const verificarElegibilidad = async (op: any) => {
    setOpSel(op);
    setCargandoEleg(true);
    setPaso("elegibilidad");
    try {
      const res = await fetch(`/api/renovaciones?operacionId=${op.id}&entidadId=${entidadData?.id}`);
      const data = await res.json();
      setElegibilidad(data.resumen ? data : null);
      if (data.elegible) {
        setNuevoMonto(String(op.financiero?.montoSolicitado || ""));
      }
    } finally { setCargandoEleg(false); }
  };

  // Confirmar renovación
  const confirmar = async () => {
    if (!opSel || !ofertaSel) return;
    setProcesando(true);
    try {
      const res = await fetch("/api/renovaciones", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionOrigenId: opSel.id,
          entidadId:         entidadData?.id,
          usuarioEmail:      userData?.email,
          nuevoMonto:        parseInt(nuevoMonto),
          nuevasCuotas:      parseInt(nuevasCuotas),
          nuevoFondeo:       ofertaSel,
          saldoPendiente:    elegibilidad?.resumen?.saldoPendiente || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) { alert("Error: " + data.error); return; }
      setResultado(data);
      setPaso("resultado");
    } finally { setProcesando(false); }
  };

  // Descargar carta de precancelación
  const descargarCarta = async (nuevaOpId?: string) => {
    const res = await fetch("/api/renovaciones/carta-precancelacion", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operacionOrigenId: opSel?.id,
        nuevaOperacionId:  nuevaOpId || resultado?.nuevaOperacionId,
        entidadId:         entidadData?.id,
      }),
    });
    if (!res.ok) { alert("Error al generar la carta"); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `CartaPrecancelacion_${opSel?.cliente?.dni}.pdf`;
    a.click(); URL.revokeObjectURL(url);
  };

  // WhatsApp masivo a elegibles
  const notificarElegibles = async () => {
    const elegibles = ops.filter(o =>
      o.estado === "FINALIZADO" ||
      (o.estado === "LIQUIDADO" && (o.pagos360?.cuotasPagadas || 0) >= 3)
    );
    if (!elegibles.length) { alert("No hay clientes elegibles en este momento."); return; }
    setEnviandoWS(true);
    try {
      await fetch("/api/notificaciones/whatsapp-masivo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidadId: entidadData?.id,
          tipo:      "RENOVACION_DISPONIBLE",
          operacionIds: elegibles.map(o => o.id),
        }),
      });
      alert(`Notificación enviada a ${elegibles.length} clientes elegibles.`);
    } finally { setEnviandoWS(false); }
  };

  const reiniciar = () => {
    setPaso("lista"); setOpSel(null); setElegibilidad(null);
    setOfertaSel(null); setResultado(null); setNuevoMonto(""); cargar();
  };

  const montoNum  = parseInt(nuevoMonto) || 0;
  const cuotasNum = parseInt(nuevasCuotas) || 12;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Renovaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">{ops.length} créditos activos o finalizados</p>
        </div>
        <div className="flex gap-2">
          {paso === "lista" && (
            <button onClick={notificarElegibles} disabled={enviandoWS}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-sm font-bold disabled:opacity-50">
              {enviandoWS ? <Loader2 size={13} className="animate-spin"/> : <span>📲</span>}
              Notificar elegibles por WS
            </button>
          )}
          {paso !== "lista" && (
            <button onClick={reiniciar}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm font-bold">
              <RotateCcw size={13}/> Volver a lista
            </button>
          )}
        </div>
      </div>

      {/* ── LISTA ── */}
      {paso === "lista" && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar cliente o DNI..."
              className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none"/>
          </div>

          {cargando ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-600" size={22}/></div>
          ) : (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-900">
              {opsFiltradas.length === 0 && (
                <p className="text-center py-12 text-gray-600 text-sm">No hay créditos disponibles.</p>
              )}
              {opsFiltradas.map(op => {
                const cuotasPag = op.pagos360?.cuotasPagadas || 0;
                const totalCuot = op.financiero?.cuotas || 0;
                const elegible  = op.estado === "FINALIZADO" || (op.estado === "LIQUIDADO" && cuotasPag >= 3);
                return (
                  <div key={op.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white">{op.cliente?.nombre}</p>
                      <p className="text-xs text-gray-500">DNI {op.cliente?.dni} · {op.tipo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-white">{fmt(op.financiero?.montoSolicitado || 0)}</p>
                      <p className="text-[10px] text-gray-500">{cuotasPag}/{totalCuot} cuotas</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                      op.estado === "FINALIZADO" ? "text-green-400 bg-green-900/20" : "text-blue-400 bg-blue-900/20"}`}>
                      {op.estado}
                    </span>
                    <button onClick={() => verificarElegibilidad(op)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                        elegible
                          ? "text-white hover:brightness-110"
                          : "text-gray-600 border border-gray-800 cursor-default"}`}
                      style={elegible ? { backgroundColor: colorPrimario } : {}}
                      disabled={!elegible}>
                      {elegible ? <><RefreshCw size={11}/> Renovar</> : "No elegible"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ELEGIBILIDAD ── */}
      {paso === "elegibilidad" && (
        <div className="space-y-4">
          {cargandoEleg ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-600" size={22}/></div>
          ) : elegibilidad ? (
            <>
              {/* Resumen operación origen */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Crédito a renovar</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Monto original",    valor: fmt(elegibilidad.resumen.monto)           },
                    { label: "Cuotas pagadas",     valor: `${elegibilidad.resumen.cuotasPagadas}/${elegibilidad.resumen.totalCuotas}` },
                    { label: "Saldo pendiente",    valor: fmt(elegibilidad.resumen.saldoPendiente), color: "text-orange-400" },
                    { label: "Fondeador actual",   valor: elegibilidad.resumen.fondeadorActual      },
                  ].map((k, i) => (
                    <div key={i} className="bg-gray-900/40 rounded-xl p-3">
                      <p className={`text-base font-black ${k.color || "text-white"}`}>{k.valor}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configurar nuevo crédito */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Nuevo crédito</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase mb-1.5 block">Monto</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input type="number" value={nuevoMonto} onChange={e => { setNuevoMonto(e.target.value); setOfertaSel(null); }}
                        className="w-full bg-black border border-gray-800 rounded-xl pl-7 pr-3 py-3 text-white font-mono text-lg outline-none focus:border-gray-600"/>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase mb-1.5 block">Cuotas</label>
                    <select value={nuevasCuotas} onChange={e => { setNuevasCuotas(e.target.value); setOfertaSel(null); }}
                      className="w-full bg-black border border-gray-800 rounded-xl px-3 py-3 text-white font-bold outline-none">
                      {[6,9,12,18,24,36].map(n => <option key={n} value={n}>{n} cuotas</option>)}
                    </select>
                  </div>
                </div>

                {/* Nota saldo */}
                {elegibilidad.resumen.saldoPendiente > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-900/10 border border-orange-900/30 text-xs text-orange-300">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
                    El nuevo fondeador deberá cancelar <strong>{fmt(elegibilidad.resumen.saldoPendiente)}</strong> al fondeador anterior. La carta de precancelación se generará al confirmar.
                  </div>
                )}
              </div>

              {/* Simulador de fondeadores */}
              {montoNum > 0 && (
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-3">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Seleccionar nuevo fondeador</p>
                  <SimuladorFinanciero
                    monto={montoNum}
                    cuotas={cuotasNum}
                    scoreCliente={opSel?.scoring?.puntaje || 500}
                    entidadId={entidadData?.id || ""}
                    colorPrimario={colorPrimario}
                    onConfirm={(oferta) => { setOfertaSel(oferta); setPaso("confirmar"); }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-600 text-sm">Error al verificar elegibilidad.</div>
          )}
        </div>
      )}

      {/* ── CONFIRMAR ── */}
      {paso === "confirmar" && ofertaSel && (
        <div className="space-y-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Resumen de renovación</p>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex-1 bg-gray-900/40 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Saldo a cancelar</p>
                <p className="font-black text-orange-400">{fmt(elegibilidad.resumen.saldoPendiente)}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{elegibilidad.resumen.fondeadorActual}</p>
              </div>
              <ArrowRight size={16} className="text-gray-600 shrink-0"/>
              <div className="flex-1 bg-gray-900/40 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Nuevo crédito</p>
                <p className="font-black text-white">{fmt(montoNum)}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{ofertaSel.nombre}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Cuota nueva",  valor: fmt(ofertaSel.cuotaFinal) },
                { label: "Cuotas",       valor: `${cuotasNum} meses`      },
                { label: "TNA",          valor: `${ofertaSel.tna}%`       },
              ].map((k, i) => (
                <div key={i} className="bg-gray-900/40 rounded-xl p-3">
                  <p className="font-black text-white">{k.valor}</p>
                  <p className="text-[10px] text-gray-500">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPaso("elegibilidad")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm">
              <RotateCcw size={13}/> Volver
            </button>
            <button onClick={confirmar} disabled={procesando}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-black text-sm disabled:opacity-50"
              style={{ backgroundColor: colorPrimario }}>
              {procesando ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
              Confirmar renovación
            </button>
          </div>
        </div>
      )}

      {/* ── RESULTADO ── */}
      {paso === "resultado" && resultado && (
        <div className="space-y-4">
          <div className="bg-green-900/10 border border-green-900/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400"/>
              <div>
                <p className="font-black text-white">Renovación creada correctamente</p>
                <p className="text-xs text-gray-500">Nueva operación ID: {resultado.nuevaOperacionId}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              La operación anterior quedó en estado <strong className="text-white">EN_RENOVACION</strong>. La nueva operación está en <strong className="text-white">EN_REVISION</strong> esperando aprobación.
            </p>
          </div>

          <button onClick={() => descargarCarta()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 text-white font-black text-sm transition-all hover:brightness-110"
            style={{ borderColor: colorPrimario, color: colorPrimario }}>
            <Download size={16}/> Descargar Carta de Precancelación (PDF)
          </button>

          <button onClick={reiniciar}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-700 text-gray-400 font-bold text-sm">
            <RotateCcw size={13}/> Nueva renovación
          </button>
        </div>
      )}
    </div>
  );
}
