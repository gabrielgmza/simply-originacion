"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Search, Loader2, CheckCircle2, AlertTriangle, Send, Zap, FileCheck, ExternalLink } from "lucide-react";

type Paso = "BUSCAR" | "PROPUESTAS" | "CONFIRMANDO" | "COMPLETADO" | "ERROR";

export default function CuadPage() {
  const { userData, entidadData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [paso, setPaso] = useState<Paso>("BUSCAR");
  const [dni, setDni] = useState("");
  const [sexo, setSexo] = useState("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resultado de la consulta
  const [cupoMaximo, setCupoMaximo] = useState(0);
  const [nombreEmpleado, setNombreEmpleado] = useState("");
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [propuestaSeleccionada, setPropuestaSeleccionada] = useState<any>(null);

  // Resultado del Alta
  const [codigoCAD, setCodigoCAD] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [operacionId, setOperacionId] = useState("");

  const consultarCupo = async () => {
    if (dni.length < 7) { setError("Ingresá un DNI válido."); return; }
    setError(""); setLoading(true);
    try {
      // Consultar cupo via bot
      const botUrl = process.env.NEXT_PUBLIC_BOT_URL || "https://simply-bot-mendoza.run.app";
      const res = await fetch(`${botUrl}/api/simular-cupo`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni, sexo, usuario: "placeholder", password: "placeholder" }),
      });
      const data = await res.json();

      if (data.noRegistra) { setError("El DNI no registra como empleado público de Mendoza."); return; }
      if (!data.success)   { setError("Error al consultar el cupo. Reintentá."); return; }

      setCupoMaximo(data.cupoMaximo);
      setNombreEmpleado(data.nombre || "");

      // Calcular propuestas cruzando con fondeadores
      const propRes = await fetch("/api/cuad/propuestas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cupoMaximo: data.cupoMaximo, entidadId: entidadData?.id }),
      });
      const propData = await propRes.json();
      setPropuestas(propData.propuestas || []);
      setPaso("PROPUESTAS");

    } catch (e) { setError("Error de conexión."); }
    finally { setLoading(false); }
  };

  const enviarWhatsApp = (propuesta: any) => {
    const msg = encodeURIComponent(
      `Hola! Tenemos una propuesta de crédito CUAD para vos:%0A%0A` +
      `Monto: $${propuesta.monto.toLocaleString("es-AR")}%0A` +
      `Cuotas: ${propuesta.cuotas} x $${propuesta.cuotaMensual.toLocaleString("es-AR")}%0A` +
      `TNA: ${propuesta.tna}%%0A%0A` +
      `Si te interesa, respondé este mensaje y te guiamos con el proceso.`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const ejecutarAlta = async (propuesta: any) => {
    if (!confirm(`Confirmar Alta CUAD por $${propuesta.monto.toLocaleString("es-AR")} ` +
                 `(cuota $${propuesta.cuotaMensual.toLocaleString("es-AR")})?\n\n` +
                 `Esta acción es IRREVERSIBLE y genera el descuento en el recibo de sueldo.`)) return;

    setPropuestaSeleccionada(propuesta);
    setPaso("CONFIRMANDO");
    setLoading(true);

    try {
      // Crear la operacion primero (necesitamos el ID para el comprobante)
      const opRes = await fetch("/api/operaciones/crear-cuad", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidadId: entidadData?.id, vendedorId: userData?.uid,
          dni, cupoMaximo, propuesta, nombreEmpleado,
        }),
      });
      const opData = await opRes.json();
      if (!opData.success) throw new Error(opData.error || "No se pudo crear la operación.");
      setOperacionId(opData.operacionId);

      // Ejecutar el Alta en el gobierno
      const altaRes = await fetch("/api/cuad/reservar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId: opData.operacionId, entidadId: entidadData?.id,
          dni, montoCuota: propuesta.cuotaMensual,
        }),
      });
      const altaData = await altaRes.json();
      if (!altaData.success) throw new Error(altaData.error || "El Alta falló.");

      setCodigoCAD(altaData.codigoCAD || "");
      setScreenshotUrl(altaData.screenshotUrl || "");
      setPaso("COMPLETADO");

    } catch (e: any) {
      setError(e.message || "Error al ejecutar el Alta.");
      setPaso("ERROR");
    } finally {
      setLoading(false);
    }
  };

  const ic = "bg-[#111] border border-gray-700 p-3 rounded-lg text-white focus:outline-none";

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-12 font-sans">
      <div className="max-w-3xl mx-auto">

        <div className="mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold mb-1">Crédito CUAD</h1>
          <p className="text-gray-400">Descuento por haberes — Empleados Públicos Mendoza</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-10 text-xs font-bold uppercase tracking-widest">
          {[["BUSCAR","1. Consulta"],["PROPUESTAS","2. Propuestas"],["CONFIRMANDO","3. Alta"],["COMPLETADO","4. Comprobante"]].map(([p, label], i) => (
            <div key={p} className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full transition-all ${paso === p ? "text-white" : "text-gray-600 bg-gray-800"}`}
                style={paso === p ? { background: colorPrimario } : {}}>
                {label}
              </span>
              {i < 3 && <span className="text-gray-700">→</span>}
            </div>
          ))}
        </div>

        {/* ── PASO 1: BUSCAR ─────────────────────────────────────────────── */}
        {paso === "BUSCAR" && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8 space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: colorPrimario }}>
              <Search size={18}/> Datos del Solicitante
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 uppercase block mb-1">DNI</label>
                <input value={dni} onChange={e => setDni(e.target.value.replace(/\D/g,""))}
                  placeholder="Sin puntos" maxLength={8} className={ic + " w-full"}/>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Sexo</label>
                <select value={sexo} onChange={e => setSexo(e.target.value)} className={ic + " w-full"}>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>

            {error && <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 text-sm"><AlertTriangle size={16}/>{error}</div>}

            <div className="bg-yellow-950/20 border border-yellow-900/30 rounded-lg p-3 text-xs text-yellow-500">
              La consulta tarda entre 20 y 40 segundos porque resuelve captchas en el portal del Gobierno de Mendoza.
            </div>

            <button onClick={consultarCupo} disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 hover:opacity-90 transition-all"
              style={{ backgroundColor: colorPrimario }}>
              {loading ? <><Loader2 className="animate-spin"/> Consultando portal del Gobierno...</> : <><Search size={18}/> Consultar Cupo Disponible</>}
            </button>
          </div>
        )}

        {/* ── PASO 2: PROPUESTAS ─────────────────────────────────────────── */}
        {paso === "PROPUESTAS" && (
          <div className="space-y-6">
            {/* Resultado consulta */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Empleado</p>
                  <p className="text-xl font-bold text-white">{nombreEmpleado || `DNI ${dni}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold">Cupo disponible</p>
                  <p className="text-2xl font-black" style={{ color: colorPrimario }}>
                    ${cupoMaximo.toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-gray-500">cuota máxima mensual</p>
                </div>
              </div>
            </div>

            {/* Propuestas */}
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Propuestas disponibles</h2>
            {propuestas.length === 0 ? (
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8 text-center text-gray-500">
                No hay fondeadores configurados. Configurá fondeadores en el panel de fondeadores.
              </div>
            ) : (
              <div className="space-y-4">
                {propuestas.map((p, i) => (
                  <div key={i} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-white text-lg">{p.fondeadorNombre}</p>
                        <p className="text-xs text-gray-500">TNA {p.tna}% · {p.cuotas} cuotas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white">${p.monto.toLocaleString("es-AR")}</p>
                        <p className="text-sm text-gray-400">Cuota: ${p.cuotaMensual.toLocaleString("es-AR")}/mes</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => enviarWhatsApp(p)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white text-sm font-bold transition-all">
                        <Send size={14}/> Enviar por WhatsApp
                      </button>
                      <button onClick={() => ejecutarAlta(p)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm text-white hover:opacity-90 transition-all"
                        style={{ background: colorPrimario }}>
                        <Zap size={14}/> Cliente Acepta — Ejecutar Alta
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setPaso("BUSCAR"); setDni(""); setCupoMaximo(0); setPropuestas([]); }}
              className="text-gray-500 hover:text-white text-sm underline">
              ← Nueva consulta
            </button>
          </div>
        )}

        {/* ── PASO 3: CONFIRMANDO ────────────────────────────────────────── */}
        {paso === "CONFIRMANDO" && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-12 text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-6" style={{ color: colorPrimario }}/>
            <h2 className="text-xl font-bold mb-2">Ejecutando Alta en el Gobierno</h2>
            <p className="text-gray-400 text-sm mb-1">El bot está operando el portal de descuentos de Mendoza.</p>
            <p className="text-gray-500 text-xs">Esto puede tardar hasta 60 segundos. No cierres esta pantalla.</p>
            {propuestaSeleccionada && (
              <div className="mt-6 p-4 bg-gray-900 rounded-xl inline-block text-left">
                <p className="text-xs text-gray-500 mb-1">Ejecutando para</p>
                <p className="font-bold">{nombreEmpleado} · DNI {dni}</p>
                <p className="text-sm text-gray-400">${propuestaSeleccionada.monto.toLocaleString("es-AR")} · {propuestaSeleccionada.cuotas} cuotas</p>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 4: COMPLETADO ─────────────────────────────────────────── */}
        {paso === "COMPLETADO" && (
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-10 text-center">
              <CheckCircle2 size={56} className="mx-auto mb-4" style={{ color: colorPrimario }}/>
              <h2 className="text-2xl font-bold mb-1">Alta ejecutada correctamente</h2>
              <p className="text-gray-400 text-sm mb-6">El descuento fue registrado en el portal del Gobierno de Mendoza.</p>
              {codigoCAD && (
                <div className="inline-block px-6 py-3 rounded-xl border border-gray-700 bg-gray-900 mb-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Código CAD</p>
                  <p className="text-2xl font-mono font-black tracking-widest" style={{ color: colorPrimario }}>{codigoCAD}</p>
                </div>
              )}
              <div className="flex gap-3 justify-center mt-4">
                {screenshotUrl && (
                  <a href={screenshotUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white text-sm font-bold">
                    <FileCheck size={14}/> Ver comprobante del gobierno
                  </a>
                )}
                <button onClick={() => window.location.href = `/dashboard/operaciones`}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm text-white hover:opacity-90"
                  style={{ background: colorPrimario }}>
                  <ExternalLink size={14}/> Ver operación
                </button>
              </div>
            </div>

            <button onClick={() => { setPaso("BUSCAR"); setDni(""); setCupoMaximo(0); setPropuestas([]); setCodigoCAD(""); setScreenshotUrl(""); }}
              className="w-full py-3 rounded-xl border border-gray-800 text-gray-500 hover:text-white font-bold text-sm">
              Nueva operación CUAD
            </button>
          </div>
        )}

        {/* ── ERROR ──────────────────────────────────────────────────────── */}
        {paso === "ERROR" && (
          <div className="bg-[#0A0A0A] border border-red-900/50 rounded-2xl p-10 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500"/>
            <h2 className="text-xl font-bold mb-2 text-red-400">El Alta no pudo completarse</h2>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button onClick={() => { setPaso("PROPUESTAS"); setError(""); }}
              className="px-8 py-3 rounded-xl font-bold text-white hover:opacity-90"
              style={{ background: colorPrimario }}>
              Volver a intentar
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
