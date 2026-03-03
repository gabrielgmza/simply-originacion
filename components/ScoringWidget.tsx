"use client";
// components/ScoringWidget.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { colorDecision } from "@/lib/scoring/motor";
import {
  Loader2, RefreshCw, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, ChevronDown, ChevronUp
} from "lucide-react";

interface Props {
  operacionId: string;
  scoringActual?: {          // datos ya en la operación (evita re-fetch)
    puntaje:  number;
    decision: "APROBADO" | "REVISION" | "RECHAZADO";
    alertas:  string[];
    ultimoCalculo?: any;
  };
  mostrarBotonRecalcular?: boolean;
}

export default function ScoringWidget({ operacionId, scoringActual, mostrarBotonRecalcular = true }: Props) {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [scoring,      setScoring]      = useState(scoringActual || null);
  const [historial,    setHistorial]    = useState<any[]>([]);
  const [calculando,   setCalculando]   = useState(false);
  const [expandido,    setExpandido]    = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);

  // Cargar historial al expandir
  useEffect(() => {
    if (!verHistorial || !operacionId) return;
    const cargar = async () => {
      const snap = await getDocs(
        query(collection(db, "historial_scoring"),
          where("operacionId", "==", operacionId),
          orderBy("fecha", "desc"),
          limit(10))
      );
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    cargar();
  }, [verHistorial, operacionId]);

  const recalcular = async () => {
    if (!entidadData?.id) return;
    setCalculando(true);
    try {
      const res = await fetch("/api/scoring/calcular", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId,
          entidadId:    entidadData.id,
          usuarioEmail: userData?.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScoring(data.resultado);
        setHistorial([]); // forzar recarga si se abre historial
      }
    } catch (e) { console.error(e); }
    finally { setCalculando(false); }
  };

  // Si no hay scoring todavía
  if (!scoring) return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Scoring crediticio</p>
      <p className="text-sm text-gray-600 mb-3">Sin score calculado para esta operación.</p>
      {mostrarBotonRecalcular && (
        <button onClick={recalcular} disabled={calculando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: colorPrimario }}>
          {calculando ? <Loader2 size={13} className="animate-spin"/> : <TrendingUp size={13}/>}
          Calcular score
        </button>
      )}
    </div>
  );

  const colores = colorDecision(scoring.decision);
  const porcPuntaje = Math.round((scoring.puntaje / 1000) * 100);

  return (
    <div className={`bg-[#0A0A0A] border rounded-2xl overflow-hidden ${colores.border}`}>

      {/* Header del score */}
      <div className={`p-5 ${colores.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Score crediticio</p>
          {mostrarBotonRecalcular && (
            <button onClick={recalcular} disabled={calculando}
              className="text-gray-500 hover:text-white transition-colors">
              {calculando ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
            </button>
          )}
        </div>

        <div className="flex items-end gap-4">
          <div>
            <p className={`text-5xl font-black ${colores.text}`}>{scoring.puntaje}</p>
            <p className="text-gray-500 text-xs">de 1000 puntos</p>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-black/30 rounded-full overflow-hidden mb-1">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${porcPuntaje}%`,
                  background: scoring.decision === "APROBADO" ? "#22c55e" :
                              scoring.decision === "REVISION"  ? "#eab308" : "#ef4444" }}/>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${colores.bg} ${colores.text} border ${colores.border}`}>
              {scoring.decision === "APROBADO"  && <CheckCircle2 size={11}/>}
              {scoring.decision === "REVISION"  && <Clock size={11}/>}
              {scoring.decision === "RECHAZADO" && <AlertTriangle size={11}/>}
              {scoring.decision}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {scoring.alertas?.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-800/50 space-y-1">
          {scoring.alertas.map((a: string, i: number) => (
            <p key={i} className="text-xs text-orange-400 flex items-start gap-1.5">
              <AlertTriangle size={11} className="shrink-0 mt-0.5"/> {a}
            </p>
          ))}
        </div>
      )}

      {/* Detalle breakdown (expandible) */}
      <div className="border-t border-gray-800/50">
        <button onClick={() => setExpandido(!expandido)}
          className="w-full px-5 py-3 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <span className="font-bold uppercase tracking-widest">Detalle por variable</span>
          {expandido ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>

        {expandido && scoring.breakdown && (
          <div className="px-5 pb-4 space-y-3">
            {scoring.breakdown.map((b: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-300">{b.categoria}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600">peso {b.peso}%</span>
                    <span className="text-xs font-black text-white">+{b.aporte.toFixed(1)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full bg-blue-500"
                    style={{ width: `${b.puntajeParcial}%` }}/>
                </div>
                <p className="text-[10px] text-gray-600">{b.detalle}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="border-t border-gray-800/50">
        <button onClick={() => setVerHistorial(!verHistorial)}
          className="w-full px-5 py-3 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <span className="font-bold uppercase tracking-widest">Historial de scores</span>
          {verHistorial ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>

        {verHistorial && (
          <div className="px-5 pb-4 space-y-2">
            {historial.length === 0 && (
              <p className="text-xs text-gray-600">Cargando historial...</p>
            )}
            {historial.map((h: any, i: number) => {
              const c = colorDecision(h.decision);
              return (
                <div key={h.id} className="flex items-center justify-between bg-gray-900/40 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${c.text}`}>{h.puntaje}</span>
                    <span className={`text-[10px] font-bold ${c.text}`}>{h.decision}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500">{h.fecha?.toDate?.()?.toLocaleDateString("es-AR") || "—"}</p>
                    <p className="text-[10px] text-gray-600">{h.calculadoPor}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
