"use client";
// app/dashboard/originador/legajo/formulario-aprobacion.tsx
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import SimuladorFinanciero from "@/app/dashboard/originacion/SimuladorFinanciero";
import {
  UploadCloud, CheckCircle2, FileText, Calculator,
  CreditCard, Loader2, LandmarkIcon, Landmark,
  ChevronRight, ChevronDown, Save
} from "lucide-react";

interface Props {
  dniBuscado:    string;
  scoreCliente?: number;
  datosBcra?:    any;
}

export default function FormularioAprobacion({ dniBuscado, scoreCliente = 500, datosBcra }: Props) {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [monto,            setMonto]            = useState("");
  const [cuotas,           setCuotas]           = useState("12");
  const [archivos,         setArchivos]         = useState({ dniFrente: false, dniDorso: false, recibo: false });
  const [ofertaConfirmada, setOfertaConfirmada] = useState<any>(null);
  const [mostrarSim,       setMostrarSim]       = useState(false);
  const [guardando,        setGuardando]        = useState(false);
  const [operacionId,      setOperacionId]      = useState<string | null>(null);
  const [ok,               setOk]               = useState(false);

  const simularUpload = (tipo: "dniFrente" | "dniDorso" | "recibo") =>
    setArchivos(prev => ({ ...prev, [tipo]: true }));

  const montoNum  = parseInt(monto)  || 0;
  const cuotasNum = parseInt(cuotas) || 12;

  // Preview cuota rápida sin motor
  const TEM          = ((entidadData?.configuracion?.tasaInteresBase || 80) / 100) / 12;
  const cuotaEstimada = montoNum && cuotasNum
    ? Math.round((montoNum * TEM * Math.pow(1 + TEM, cuotasNum)) / (Math.pow(1 + TEM, cuotasNum) - 1))
    : 0;

  const handleMontoChange  = (v: string) => { setMonto(v);  setOfertaConfirmada(null); setMostrarSim(false); };
  const handleCuotasChange = (v: string) => { setCuotas(v); setOfertaConfirmada(null); setMostrarSim(false); };

  const onConfirmarOferta = async (oferta: any) => {
    setOfertaConfirmada(oferta);
    setMostrarSim(false);
    // Si ya hay op creada, asignar fondeador
    if (operacionId && oferta.fondeadorId !== "propio") {
      await fetch("/api/fondeo", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId, fondeadorId: oferta.fondeadorId,
          oferta, usuarioEmail: userData?.email, entidadId: entidadData?.id,
        }),
      });
    }
  };

  const guardarOperacion = async () => {
    if (!montoNum || !ofertaConfirmada) return;
    setGuardando(true);
    try {
      const res = await fetch("/api/operaciones", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidadId:  entidadData?.id,
          vendedorId: userData?.uid,
          sucursalId: userData?.sucursalId,
          tipo:       "PRIVADO",
          estado:     "EN_REVISION",
          cliente: {
            dni:       dniBuscado,
            nombre:    datosBcra?.denominacionBCRA || "—",
            scoreBcra: datosBcra?.situacionCrediticia,
          },
          financiero: {
            montoSolicitado: montoNum,
            cuotas:          cuotasNum,
            valorCuota:      ofertaConfirmada.cuotaFinal,
            tna:             ofertaConfirmada.tna,
            cft:             ofertaConfirmada.cft,
            totalDevolver:   ofertaConfirmada.totalDevolver,
          },
          scoring: { puntaje: scoreCliente },
          fondeo: {
            fondeadorId: ofertaConfirmada.fondeadorId,
            nombre:      ofertaConfirmada.nombre,
            tna:         ofertaConfirmada.tna,
            cuotaFinal:  ofertaConfirmada.cuotaFinal,
            comision:    ofertaConfirmada.comision,
          },
          legajo: {
            dniFrenteUrl: archivos.dniFrente ? "pendiente_upload" : null,
            dniDorsoUrl:  archivos.dniDorso  ? "pendiente_upload" : null,
          },
        }),
      });
      const data = await res.json();
      if (data.id || data.success) { setOperacionId(data.id || data.operacionId); setOk(true); }
    } finally { setGuardando(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* DNI badge */}
      <div className="bg-green-950/20 border border-green-900/50 p-4 rounded-xl flex items-center gap-3">
        <LandmarkIcon className="text-green-500" size={18}/>
        <p className="text-sm font-bold text-gray-300">
          DNI auditado: <span className="text-white font-black font-mono ml-1">{dniBuscado}</span>
          {scoreCliente > 0 && <span className="ml-3 text-xs text-gray-500">Score: <span className="text-white font-black">{scoreCliente}</span></span>}
        </p>
      </div>

      <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
        <div className="bg-green-600/20 p-2 rounded-xl text-green-500"><Calculator size={20}/></div>
        <h2 className="text-xl font-black text-white uppercase tracking-wide">Estructura del Crédito</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Monto + cuotas */}
        <div className="space-y-5">
          <div>
            <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Monto a otorgar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input type="number" value={monto} onChange={e => handleMontoChange(e.target.value)}
                placeholder="Ej: 150000"
                className="w-full bg-black border border-gray-800 p-4 pl-8 rounded-2xl text-white outline-none focus:border-green-500 font-mono text-lg"/>
            </div>
          </div>

          <div>
            <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Plan de cuotas</label>
            <select value={cuotas} onChange={e => handleCuotasChange(e.target.value)}
              className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-green-500 font-bold">
              {[1,3,6,9,12,18,24,36].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? "cuota" : "cuotas"}</option>
              ))}
            </select>
          </div>

          {/* Preview cuota */}
          {montoNum > 0 && !ofertaConfirmada && (
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Cuota estimada</p>
                <p className="text-white font-mono text-xl">{fmt(cuotaEstimada)}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Preliminar — confirmar con fondeador</p>
              </div>
              <CreditCard className="text-gray-600" size={24}/>
            </div>
          )}

          {/* Oferta confirmada */}
          {ofertaConfirmada && (
            <div className="bg-green-900/10 border border-green-900/40 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase">
                <CheckCircle2 size={13}/> Fondeador confirmado
              </div>
              <p className="font-black text-white">{ofertaConfirmada.nombre}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-gray-500">Cuota</p><p className="text-white font-black">{fmt(ofertaConfirmada.cuotaFinal)}</p></div>
                <div><p className="text-gray-500">TNA</p><p className="text-white font-black">{ofertaConfirmada.tna}%</p></div>
              </div>
              <button onClick={() => setMostrarSim(true)} className="text-xs text-gray-500 hover:text-white underline">
                Cambiar fondeador
              </button>
            </div>
          )}

          {/* Botón abrir simulador */}
          {montoNum > 0 && !ofertaConfirmada && (
            <button onClick={() => setMostrarSim(!mostrarSim)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all font-bold text-sm">
              <Landmark size={14}/>
              {mostrarSim ? "Ocultar fondeadores" : "Ver fondeadores disponibles"}
              {mostrarSim ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            </button>
          )}
        </div>

        {/* Documentación */}
        <div className="space-y-4">
          <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest">Documentación</label>
          {[
            { key: "dniFrente", label: "DNI Frente"       },
            { key: "dniDorso",  label: "DNI Dorso"        },
            { key: "recibo",    label: "Recibo de Sueldo" },
          ].map(d => (
            <button key={d.key} onClick={() => simularUpload(d.key as any)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                (archivos as any)[d.key]
                  ? "bg-green-900/20 border-green-900 text-green-500"
                  : "bg-black border-gray-800 text-gray-400 hover:border-gray-600"}`}>
              <span className="font-bold flex items-center gap-2"><FileText size={16}/>{d.label}</span>
              {(archivos as any)[d.key] ? <CheckCircle2 size={18}/> : <UploadCloud size={18}/>}
            </button>
          ))}
        </div>
      </div>

      {/* Simulador inline */}
      {mostrarSim && montoNum > 0 && (
        <div className="border border-gray-800 rounded-2xl p-5 bg-[#060606] animate-in fade-in duration-300">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Fondeadores disponibles</p>
          <SimuladorFinanciero
            monto={montoNum}
            cuotas={cuotasNum}
            scoreCliente={scoreCliente}
            entidadId={entidadData?.id || ""}
            operacionId={operacionId || undefined}
            colorPrimario={colorPrimario}
            onConfirm={onConfirmarOferta}
          />
        </div>
      )}

      {/* Guardar */}
      {ok ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-900/10 border border-green-900/40 text-green-400">
          <CheckCircle2 size={18}/>
          <div>
            <p className="font-black">Operación guardada</p>
            <p className="text-xs opacity-70">ID: {operacionId} · Estado: EN_REVISION</p>
          </div>
        </div>
      ) : (
        <button onClick={guardarOperacion}
          disabled={!montoNum || !ofertaConfirmada || guardando}
          className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: colorPrimario }}>
          {guardando
            ? <><Loader2 size={16} className="animate-spin"/> Guardando...</>
            : <><Save size={16}/> {!ofertaConfirmada ? "Confirmar fondeador primero" : "Guardar Operación"}</>}
        </button>
      )}
    </div>
  );
}
