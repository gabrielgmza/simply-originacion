"use client";
// app/dashboard/originacion/SimuladorFinanciero.tsx
// Conectado al motor real de subasta (/api/fondeo)
// - Carga ofertas reales con cupo, scoring y TNA de cada fondeador
// - Selección automática del óptimo (menor cuota)
// - El vendedor puede cambiar manualmente

import { useState, useEffect } from "react";
import {
  Landmark, Check, Loader2, AlertTriangle,
  Zap, RefreshCw, ChevronDown, ChevronUp, Info
} from "lucide-react";

interface Props {
  monto:        number;
  cuotas:       number;
  scoreCliente: number;   // puntaje scoring del cliente (0-1000)
  entidadId:    string;
  operacionId?: string;   // si ya existe la op, para asignar al confirmar
  colorPrimario?: string;
  onConfirm:    (oferta: any) => void;
}

const fmt  = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtM = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${(n/1000).toFixed(0)}K`;

export default function SimuladorFinanciero({
  monto, cuotas, scoreCliente, entidadId, operacionId, colorPrimario = "#FF5E14", onConfirm
}: Props) {
  const [ofertas,           setOfertas]           = useState<any[]>([]);
  const [ofertaSeleccionada,setOfertaSeleccionada] = useState<any>(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [mostrarTodas,      setMostrarTodas]       = useState(false);
  const [modoManual,        setModoManual]         = useState(false); // el vendedor cambió la selección
  const [confirmando,       setConfirmando]        = useState(false);

  const cargarOfertas = async () => {
    if (!monto || !cuotas || !entidadId) return;
    setLoading(true); setError(null);

    try {
      const res = await fetch("/api/fondeo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacionId: operacionId || "preview", entidadId, monto, cuotas, scoreCliente }),
      });
      const data = await res.json();

      if (!data.success) { setError(data.error || "Error al cargar ofertas"); return; }

      const lista: any[] = data.ofertas || [];

      // Si no hay fondeadores externos, agregar opción capital propio
      if (lista.length === 0) {
        // Cálculo local con capital propio
        const TEM        = (80 / 100) / 12; // TNA 80% por defecto
        const cuotaPura  = TEM > 0
          ? (monto * TEM * Math.pow(1 + TEM, cuotas)) / (Math.pow(1 + TEM, cuotas) - 1)
          : monto / cuotas;
        const total      = cuotaPura * cuotas;
        const cft        = ((total / monto) - 1) * (12 / cuotas) * 100;
        lista.push({
          fondeadorId:    "propio",
          nombre:         "Capital Propio",
          tna:            80,
          cuotaFinal:     Math.round(cuotaPura),
          totalDevolver:  Math.round(total),
          cft:            parseFloat(cft.toFixed(2)),
          comision:       0,
          cupoDisponible: 999999999,
          esOptima:       true,
        });
      }

      setOfertas(lista);
      // Auto-seleccionar la óptima (primera de la lista ordenada)
      const optima = lista.find((o: any) => o.esOptima) || lista[0];
      setOfertaSeleccionada(optima);
      setModoManual(false);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarOfertas(); }, [monto, cuotas, scoreCliente, entidadId]);

  const seleccionarOferta = (oferta: any) => {
    setOfertaSeleccionada(oferta);
    setModoManual(!oferta.esOptima);
  };

  const confirmar = async () => {
    if (!ofertaSeleccionada) return;
    setConfirmando(true);
    try { onConfirm(ofertaSeleccionada); }
    finally { setConfirmando(false); }
  };

  const ofertasVisibles = mostrarTodas ? ofertas : ofertas.slice(0, 3);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-500">
      <Loader2 size={24} className="animate-spin"/>
      <p className="text-sm font-bold">Calculando mejores ofertas...</p>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/10 border border-red-900/40 text-red-400">
      <AlertTriangle size={16}/>
      <p className="text-sm">{error}</p>
      <button onClick={cargarOfertas} className="ml-auto text-xs font-bold flex items-center gap-1 hover:text-white">
        <RefreshCw size={12}/> Reintentar
      </button>
    </div>
  );

  // ── Sin ofertas ────────────────────────────────────────────────────────────
  if (ofertas.length === 0) return (
    <div className="text-center py-8 text-gray-600 text-sm">
      No hay fondeadores disponibles para este monto/score.
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Info size={14}/>
          <span>{ofertas.length} {ofertas.length === 1 ? "opción disponible" : "opciones disponibles"}</span>
        </div>
        {modoManual && (
          <div className="flex items-center gap-1.5 text-xs text-yellow-400">
            <AlertTriangle size={11}/> Selección manual
            <button onClick={() => { setOfertaSeleccionada(ofertas.find(o => o.esOptima) || ofertas[0]); setModoManual(false); }}
              className="ml-1 text-gray-500 hover:text-white underline">
              volver al óptimo
            </button>
          </div>
        )}
        <button onClick={cargarOfertas} title="Actualizar"
          className="text-gray-600 hover:text-white transition-colors">
          <RefreshCw size={13}/>
        </button>
      </div>

      {/* Lista de ofertas */}
      <div className="space-y-2">
        {ofertasVisibles.map((oferta: any) => {
          const seleccionada = ofertaSeleccionada?.fondeadorId === oferta.fondeadorId;
          return (
            <div key={oferta.fondeadorId}
              onClick={() => seleccionarOferta(oferta)}
              className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                seleccionada
                  ? "border-transparent shadow-[0_0_0_2px] bg-white/5"
                  : "border-gray-800 hover:border-gray-600 bg-[#0A0A0A]"
              }`}
              style={seleccionada ? { boxShadow: `0 0 0 2px ${colorPrimario}` } : {}}>

              {/* Badge óptimo */}
              {oferta.esOptima && (
                <div className="absolute -top-2.5 left-4 flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: colorPrimario }}>
                  <Zap size={9}/> MEJOR OFERTA
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Ícono fondeador */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${seleccionada ? "text-white" : "bg-gray-800 text-gray-500"}`}
                  style={seleccionada ? { backgroundColor: colorPrimario } : {}}>
                  <Landmark size={16}/>
                </div>

                {/* Info fondeador */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm">{oferta.nombre}</p>
                  <p className="text-[10px] text-gray-500">
                    TNA {oferta.tna}% · CFT {oferta.cft}% · Cupo disp. {fmtM(oferta.cupoDisponible)}
                  </p>
                </div>

                {/* Cuota */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-white">{fmt(oferta.cuotaFinal)}</p>
                  <p className="text-[10px] text-gray-500">/ cuota</p>
                </div>

                {/* Check */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${seleccionada ? "border-transparent" : "border-gray-700"}`}
                  style={seleccionada ? { backgroundColor: colorPrimario } : {}}>
                  {seleccionada && <Check size={11} className="text-white"/>}
                </div>
              </div>

              {/* Detalle expandido cuando está seleccionada */}
              {seleccionada && (
                <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-2 animate-in fade-in duration-200">
                  {[
                    { label: "Total a devolver", valor: fmt(oferta.totalDevolver) },
                    { label: "Comisión Simply",  valor: fmt(oferta.comision)      },
                    { label: "Cuotas",           valor: `${cuotas} meses`         },
                  ].map((d, i) => (
                    <div key={i} className="text-center">
                      <p className="text-xs font-black text-white">{d.valor}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{d.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ver más / menos */}
      {ofertas.length > 3 && (
        <button onClick={() => setMostrarTodas(!mostrarTodas)}
          className="w-full py-2 text-xs text-gray-500 hover:text-white font-bold flex items-center justify-center gap-1 transition-colors">
          {mostrarTodas
            ? <><ChevronUp size={12}/> Ver menos</>
            : <><ChevronDown size={12}/> Ver {ofertas.length - 3} más</>}
        </button>
      )}

      {/* Confirmar */}
      {ofertaSeleccionada && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">Fondeador seleccionado</p>
            <p className="text-sm font-black text-white">{ofertaSeleccionada.nombre}</p>
            <p className="text-xs text-gray-500">{fmt(ofertaSeleccionada.cuotaFinal)}/mes · TNA {ofertaSeleccionada.tna}%</p>
          </div>
          <button onClick={confirmar} disabled={confirmando}
            className="px-6 py-3 rounded-xl text-white font-black text-sm flex items-center gap-2 disabled:opacity-60 transition-all hover:brightness-110"
            style={{ backgroundColor: colorPrimario }}>
            {confirmando ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            Confirmar oferta
          </button>
        </div>
      )}
    </div>
  );
}
