"use client";
// app/dashboard/originacion/SimuladorFinanciero.tsx
// Conectado al motor real de subasta (/api/fondeo)
// - Carga ofertas reales con cupo, scoring y TNA de cada fondeador
// - Filtra por producto (CUAD, PRIVADO, ADELANTO)
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
  producto?:    string;   // "CUAD" | "PRIVADO" | "ADELANTO"
  colorPrimario?: string;
  onConfirm:    (oferta: any) => void;
}

const fmt  = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtM = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${(n/1000).toFixed(0)}K`;

export default function SimuladorFinanciero({
  monto, cuotas, scoreCliente, entidadId, operacionId, producto, colorPrimario = "#FF5E14", onConfirm
}: Props) {
  const [ofertas,           setOfertas]           = useState<any[]>([]);
  const [ofertaSeleccionada,setOfertaSeleccionada] = useState<any>(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [mostrarTodas,      setMostrarTodas]       = useState(false);
  const [modoManual,        setModoManual]         = useState(false);
  const [confirmando,       setConfirmando]        = useState(false);

  const cargarOfertas = async () => {
    if (!monto || !cuotas || !entidadId) return;
    setLoading(true); setError(null);

    try {
      const res = await fetch("/api/fondeo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacionId: operacionId || "preview", entidadId, monto, cuotas, scoreCliente, producto }),
      });
      const data = await res.json();

      if (!data.success) { setError(data.error || "Error al cargar ofertas"); return; }

      const lista: any[] = data.ofertas || [];

      // Si no hay fondeadores externos, agregar opción capital propio
      if (lista.length === 0) {
        const TEM        = (80 / 100) / 12;
        const cuotaPura  = TEM > 0
          ? (monto * TEM * Math.pow(1 + TEM, cuotas)) / (Math.pow(1 + TEM, cuotas) - 1)
          : monto / cuotas;
        const totalDev   = cuotaPura * cuotas;
        lista.push({
          fondeadorId:    "propio",
          nombre:         "Capital Propio",
          tna:            80,
          cuotaFinal:     Math.round(cuotaPura),
          totalDevolver:  Math.round(totalDev),
          cft:            parseFloat((((totalDev / monto) - 1) * (12 / cuotas) * 100).toFixed(2)),
          comision:       0,
          cupoDisponible: 999999999,
          esOptima:       true,
        });
      }

      setOfertas(lista);
      const optima = lista.find(o => o.esOptima) || lista[0];
      setOfertaSeleccionada(optima);
      setModoManual(false);

    } catch (e: any) {
      setError("Error de conexión al cargar ofertas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarOfertas(); }, [monto, cuotas, entidadId, producto]);

  const seleccionar = (oferta: any) => {
    setOfertaSeleccionada(oferta);
    setModoManual(true);
  };

  const confirmar = async () => {
    if (!ofertaSeleccionada) return;
    setConfirmando(true);
    try {
      // Si ya hay operación y no es capital propio, asignar fondeador
      if (operacionId && ofertaSeleccionada.fondeadorId !== "propio") {
        await fetch("/api/fondeo", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operacionId,
            fondeadorId: ofertaSeleccionada.fondeadorId,
            oferta: ofertaSeleccionada,
            entidadId,
          }),
        });
      }
      onConfirm(ofertaSeleccionada);
    } finally {
      setConfirmando(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8 gap-2 text-gray-500 text-sm">
      <Loader2 size={16} className="animate-spin" /> Consultando fondeadores...
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-900/10 border border-red-900/30 rounded-xl">
      <AlertTriangle size={14} />
      <span>{error}</span>
      <button onClick={cargarOfertas} className="ml-auto text-xs text-gray-400 hover:text-white flex items-center gap-1">
        <RefreshCw size={12} /> Reintentar
      </button>
    </div>
  );

  if (ofertas.length === 0) return (
    <div className="text-center py-6 text-gray-500 text-sm">
      No hay fondeadores disponibles {producto ? `para ${producto}` : ''} con estas condiciones.
    </div>
  );

  const visibles = mostrarTodas ? ofertas : ofertas.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Info */}
      {modoManual && (
        <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-900/10 border border-blue-900/30 rounded-xl p-3">
          <Info size={12} />
          Selección manual — la oferta óptima era <strong>{ofertas.find(o => o.esOptima)?.nombre}</strong>
        </div>
      )}

      {/* Lista de ofertas */}
      {visibles.map((o, i) => (
        <button key={o.fondeadorId}
          onClick={() => seleccionar(o)}
          className={`w-full text-left p-4 rounded-2xl border transition-all ${
            ofertaSeleccionada?.fondeadorId === o.fondeadorId
              ? "border-white/30 bg-white/[0.03]"
              : "border-gray-800 hover:border-gray-700 bg-[#0A0A0A]"
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                o.esOptima ? "text-green-400 bg-green-900/30" : "text-gray-500 bg-gray-800"
              }`}>
                {o.esOptima ? <Zap size={14} /> : i + 1}
              </div>
              <div>
                <p className="font-bold text-white text-sm flex items-center gap-2">
                  {o.nombre}
                  {o.esOptima && <span className="text-[9px] text-green-400 uppercase tracking-widest font-black">Óptima</span>}
                </p>
                <p className="text-xs text-gray-500">
                  TNA {o.tna}% · CFT {o.cft}% · Cupo {fmtM(o.cupoDisponible)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-white font-mono">{fmt(o.cuotaFinal)}</p>
              <p className="text-[10px] text-gray-600">Total {fmt(o.totalDevolver)}</p>
            </div>
          </div>
          {o.comision > 0 && (
            <p className="text-[10px] text-gray-600 mt-1 ml-11">Comisión: {fmt(o.comision)}</p>
          )}
        </button>
      ))}

      {/* Ver más */}
      {ofertas.length > 3 && (
        <button onClick={() => setMostrarTodas(!mostrarTodas)}
          className="w-full text-center text-xs text-gray-500 hover:text-white py-2 flex items-center justify-center gap-1">
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
