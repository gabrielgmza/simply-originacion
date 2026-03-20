"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, Loader2, CheckCircle2, AlertTriangle, Send, Zap, FileCheck, ExternalLink, Info } from "lucide-react";

type Paso = "BUSCAR" | "PROPUESTAS" | "CONFIRMANDO" | "COMPLETADO" | "ERROR";

function esPeriodoCierre(): boolean {
  const dia = new Date().getDate();
  return dia >= 16 && dia <= 25;
}

export default function CuadPage() {
  const { userData, entidadData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [paso, setPaso] = useState<Paso>("BUSCAR");
  const [dni, setDni] = useState("");
  const [sexo, setSexo] = useState("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  const [cupoMaximo, setCupoMaximo] = useState(0);
  const [nombreEmpleado, setNombreEmpleado] = useState("");
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [propuestaSeleccionada, setPropuestaSeleccionada] = useState<any>(null);

  const [codigoCAD, setCodigoCAD] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [operacionId, setOperacionId] = useState("");

  const consultarCupo = async () => {
    if (dni.length < 7) { setError("Ingresá un DNI válido."); return; }
    if (!entidadData?.id) { setError("Error: no se detectó la entidad."); return; }
    setError(""); setWarning(null); setLoading(true);
    try {
      // Consultar cupo via API interna (gestiona credenciales de la entidad)
      const res = await fetch('/api/cuad/consultar', {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni, sexo, entidadId: entidadData.id }),
      });
      const data = await res.json();

      if (data.warning) setWarning(data.warning);

      if (data.gobiernoNoDisponible) {
        setError("El sistema de gobierno no está disponible en este momento. Intentá más tarde.");
        return;
      }
      if (data.noRegistra) { setError("El DNI no registra como empleado público de Mendoza."); return; }
      if (data.error)      { setError(data.mensaje || data.error || "Error al consultar el cupo."); return; }
      if (!data.success)   { setError("Error al consultar el cupo. Reintentá."); return; }

      setCupoMaximo(data.cupoDisponible || 0);
      setNombreEmpleado(data.nombre || "");

      // Calcular propuestas cruzando con fondeadores
      const propRes = await fetch("/api/cuad/propuestas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cupoMaximo: data.cupoDisponible, entidadId: entidadData.id }),
      });
      const propData = await propRes.json();
      setPropuestas(propData.propuestas || []);
      setPaso("PROPUESTAS");

    } catch (e) { setError("Error de conexión."); }
    finally { setLoading(false); }
  };

  const enviarWhatsApp = (propuesta: any) => {
    const msg = encodeURIComponent(
      `Hola! Te contactamos de *${entidadData?.nombreFantasia}*.\n\n` +
      `Tenés un cupo disponible de *$${cupoMaximo.toLocaleString("es-AR")}*.\n` +
      `Te ofrecemos:\n` +
      `💰 Monto: $${propuesta.monto?.toLocaleString("es-AR")}\n` +
      `📅 ${propuesta.cuotas} cuotas de $${propuesta.valorCuota?.toLocaleString("es-AR")}\n\n` +
      `¿Te interesa?`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const ejecutarAlta = async (propuesta: any) => {
    if (!entidadData?.id) return;
    setPropuestaSeleccionada(propuesta);
    setPaso("CONFIRMANDO");
    try {
      const res = await fetch("/api/cuad/reservar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId: propuesta.operacionId || "",
          entidadId: entidadData.id,
          dni,
          montoCuota: propuesta.valorCuota,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPaso("ERROR"); return; }
      setCodigoCAD(data.codigoCAD || "");
      setScreenshotUrl(data.screenshotUrl || "");
      setOperacionId(data.operacionId || "");
      setPaso("COMPLETADO");
    } catch { setError("Error al ejecutar el Alta."); setPaso("ERROR"); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">CUAD — Descuento por Haberes</h1>
        <p className="text-gray-500 text-sm mt-1">Consulta de cupo y alta de descuentos en el sistema de gobierno</p>
      </div>

      {/* Aviso cierre */}
      {esPeriodoCierre() && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-2xl p-4 flex items-start gap-3">
          <Info size={18} className="text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-bold text-sm">Período de cierre del sistema de gobierno</p>
            <p className="text-yellow-600 text-xs mt-1">Del ~16 al ~25 de cada mes el sistema puede estar inestable. Las consultas se intentarán igual.</p>
          </div>
        </div>
      )}

      {warning && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-2xl p-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-yellow-500" />
          <p className="text-yellow-500 text-xs font-bold">{warning}</p>
        </div>
      )}

      {/* BUSCAR */}
      {paso === "BUSCAR" && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input value={dni} onChange={e => { setDni(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="DNI del empleado" maxLength={8}
              className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 font-mono text-lg" />
            <select value={sexo} onChange={e => setSexo(e.target.value)}
              className="bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold">
              <option value="M">MASCULINO</option>
              <option value="F">FEMENINO</option>
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          <button onClick={consultarCupo} disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: colorPrimario }}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> Consultando sistema de gobierno...</> : <><Search size={18} /> Consultar Cupo</>}
          </button>
        </div>
      )}

      {/* PROPUESTAS */}
      {paso === "PROPUESTAS" && (
        <div className="space-y-6">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-6 text-center">
            {nombreEmpleado && <p className="text-gray-400 text-sm mb-1">{nombreEmpleado}</p>}
            <p className="text-gray-500 text-xs uppercase font-bold tracking-widest mb-2">Cupo disponible</p>
            <p className="text-5xl font-black text-white font-mono">${cupoMaximo.toLocaleString("es-AR")}</p>
          </div>

          {propuestas.length > 0 ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Propuestas disponibles</p>
              {propuestas.map((p: any, i: number) => (
                <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{p.fondeador}</p>
                    <p className="text-sm text-gray-400">{p.cuotas} cuotas de <span className="text-white font-mono">${p.valorCuota?.toLocaleString("es-AR")}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => enviarWhatsApp(p)} className="p-2 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50"><Send size={16} /></button>
                    <button onClick={() => ejecutarAlta(p)}
                      className="px-4 py-2 rounded-lg font-bold text-sm text-white" style={{ backgroundColor: colorPrimario }}>
                      <Zap size={14} className="inline mr-1" /> Ejecutar Alta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No hay propuestas de fondeadores configuradas.</p>
          )}

          <button onClick={() => { setPaso("BUSCAR"); setDni(""); setCupoMaximo(0); setPropuestas([]); }}
            className="w-full py-3 rounded-2xl border border-gray-800 text-gray-400 hover:text-white font-bold text-sm">
            ← Nueva consulta
          </button>
        </div>
      )}

      {/* CONFIRMANDO */}
      {paso === "CONFIRMANDO" && (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-[32px] p-8 text-center space-y-4">
          <Loader2 size={32} className="animate-spin text-blue-500 mx-auto" />
          <p className="text-white font-bold">Ejecutando Alta en el sistema de gobierno...</p>
          <p className="text-gray-500 text-sm">Esto puede tardar hasta 2 minutos.</p>
        </div>
      )}

      {/* COMPLETADO */}
      {paso === "COMPLETADO" && (
        <div className="bg-[#0A0A0A] border border-green-900/50 rounded-[32px] p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="text-green-500 mx-auto" />
          <p className="text-white text-xl font-black">¡Alta ejecutada con éxito!</p>
          {codigoCAD && <p className="text-gray-400">Código CAD: <span className="text-white font-mono font-bold">{codigoCAD}</span></p>}
          {screenshotUrl && (
            <a href={screenshotUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 text-sm hover:underline">
              <ExternalLink size={14} /> Ver comprobante
            </a>
          )}
          <button onClick={() => { setPaso("BUSCAR"); setDni(""); setCupoMaximo(0); setPropuestas([]); }}
            className="w-full py-3 rounded-2xl font-bold text-white mt-4" style={{ backgroundColor: colorPrimario }}>
            Nueva consulta
          </button>
        </div>
      )}

      {/* ERROR */}
      {paso === "ERROR" && (
        <div className="bg-[#0A0A0A] border border-red-900/50 rounded-[32px] p-8 text-center space-y-4">
          <AlertTriangle size={48} className="text-red-500 mx-auto" />
          <p className="text-white font-bold">Error al ejecutar el Alta</p>
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setPaso("PROPUESTAS")}
            className="px-6 py-3 rounded-2xl border border-gray-800 text-gray-400 hover:text-white font-bold text-sm">
            ← Volver a propuestas
          </button>
        </div>
      )}
    </div>
  );
}
