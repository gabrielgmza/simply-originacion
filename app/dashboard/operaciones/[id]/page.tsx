"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle, FileText, User, CreditCard, ShieldCheck, Download, FileSignature, Activity, Clock, FileWarning } from "lucide-react";

export default function LegajoDetalle() {
  const { userData, entidadData } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const [operacion, setOperacion] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const cargarLogs = useCallback(async () => {
    if (!params?.id) return;
    try {
      const qLogs = query(collection(db, "logs_operaciones"), where("operacionId", "==", params.id as string));
      const snapLogs = await getDocs(qLogs);
      const dataLogs = snapLogs.docs.map(d => ({ id: d.id, ...d.data() }));
      dataLogs.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
      setLogs(dataLogs);
    } catch (error) { console.error(error); }
  }, [params?.id]);

  useEffect(() => {
    const cargarOperacion = async () => {
      if (!userData || !params?.id) return;
      setCargando(true);
      try {
        const docRef = doc(db, "operaciones", params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().entidadId === userData.entidadId) {
          setOperacion({ id: docSnap.id, ...docSnap.data() });
          await cargarLogs();
        } else { router.push("/dashboard/operaciones"); }
      } catch (error) { console.error(error); } finally { setCargando(false); }
    };
    cargarOperacion();
  }, [userData, params.id, router, cargarLogs]);

  const registrarAuditoria = async (accion: string, detalles: string) => {
    try { await addDoc(collection(db, "logs_operaciones"), { operacionId: operacion.id, entidadId: operacion.entidadId, usuario: userData?.email || "Usuario Desconocido", accion, detalles, fecha: serverTimestamp() }); cargarLogs(); } catch (error) {}
  };

  const actualizarEstado = async (nuevoEstado: string) => {
    if (!operacion || procesando) return;
    setProcesando(true);
    try {
      await updateDoc(doc(db, "operaciones", operacion.id), { estado: nuevoEstado, fechaActualizacion: serverTimestamp() });
      setOperacion({ ...operacion, estado: nuevoEstado });
      await registrarAuditoria(`CAMBIO_ESTADO_${nuevoEstado}`, `La operacion fue pasada a estado ${nuevoEstado}.`);
    } catch (error) { } finally { setProcesando(false); }
  };

  const compilarContratoFinal = async () => {
    setGenerandoPdf(true);
    try {
      const res = await fetch("/api/documentos/generar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operacionId: operacion.id, entidadId: entidadData?.id, usuarioGenerador: userData?.email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOperacion({ ...operacion, legajo: { ...operacion.legajo, contratoFinalPdf: data.url } });
      await cargarLogs(); alert("¡Contrato fusionado exitosamente!");
    } catch (error: any) { alert(error.message); } finally { setGenerandoPdf(false); }
  };

  const formatearMoneda = (monto: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto || 0);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const puedeLiquidar = userData?.rol.includes("GERENTE") || userData?.rol === "LIQUIDADOR";

  if (cargando) return <div className="p-8 flex justify-center mt-20"><Loader2 className="animate-spin text-gray-500" size={40} /></div>;
  if (!operacion) return null;

  return (
    <div className="p-6 lg:p-12 max-w-5xl mx-auto animate-fade-in text-[#F8F9FA] font-sans">
      <div className="mb-6"><button onClick={() => router.push("/dashboard/operaciones")} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"><ArrowLeft size={16} /> Volver</button></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-6 gap-4">
        <div><h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">Legajo Digital</h1><p className="text-gray-400 text-sm font-mono bg-gray-900 px-3 py-1 rounded inline-block border border-gray-800">ID: {operacion.id}</p></div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Estado actual:</span>
          {operacion.estado === "LIQUIDADO" && <span className="flex items-center gap-1 px-3 py-1.5 bg-green-950/30 text-green-500 border border-green-900/50 rounded-full text-sm font-bold"><CheckCircle size={16}/> Liquidado</span>}
          {operacion.estado === "RECHAZADO" && <span className="flex items-center gap-1 px-3 py-1.5 bg-red-950/30 text-red-500 border border-red-900/50 rounded-full text-sm font-bold"><AlertTriangle size={16}/> Rechazado</span>}
          {(operacion.estado === "PENDIENTE_DOCS" || operacion.estado === "PENDIENTE_FIRMA_CLIENTE") && <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-950/30 text-yellow-500 border border-yellow-900/50 rounded-full text-sm font-bold"><Clock size={16}/> Pendiente</span>}
        </div>
      </div>

      {operacion.cliente?.bcraData && (
        <div className="bg-[#111] border border-blue-900/50 rounded-xl p-4 mb-6 flex items-start gap-4">
          <ShieldCheck size={28} className="text-blue-500 mt-1" />
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-gray-500">Evaluacion Oficial BCRA</p><p className="font-bold text-white">{operacion.cliente.bcraData.denominacionBCRA}</p></div>
            <div>
              <p className="text-xs text-gray-500">Situacion</p>
              <p className={`font-bold ${operacion.cliente.bcraData.situacionCrediticia > 2 ? 'text-red-500' : 'text-green-500'}`}>Categoria {operacion.cliente.bcraData.situacionCrediticia}</p>
            </div>
            <div><p className="text-xs text-gray-500">Deuda Informada</p><p className="font-mono text-white">{formatearMoneda(operacion.cliente.bcraData.montoDeudaInformada)}</p></div>
            <div>
              <p className="text-xs text-gray-500">Cheques Rechazados</p>
              {operacion.cliente.bcraData.tieneChequesRechazados ? <span className="inline-flex items-center gap-1 text-red-500 text-sm font-bold"><FileWarning size={14}/> Registra</span> : <span className="text-green-500 text-sm font-bold">Limpio</span>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-gray-800 pb-3" style={{ color: colorPrimario }}><User size={20} /> Identidad</h3>
          <div className="space-y-4">
            <div><p className="text-xs text-gray-500 mb-1">Nombre Solicitante</p><p className="font-medium text-lg">{operacion.cliente?.nombre}</p></div>
            <div><p className="text-xs text-gray-500 mb-1">CUIL Validado</p><p className="font-mono text-gray-300">{operacion.cliente?.cuil}</p></div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-gray-800 pb-3" style={{ color: colorPrimario }}><CreditCard size={20} /> Comercial</h3>
          <div className="space-y-4">
            <div><p className="text-xs text-gray-500 mb-1">Linea de Credito</p><p className="font-medium">{operacion.tipo}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500 mb-1">Capital Solicitado</p><p className="font-bold text-xl text-white">{formatearMoneda(operacion.financiero?.montoSolicitado)}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Plan de Pagos</p><p className="font-medium text-gray-300">{operacion.financiero?.cuotas} Cuota(s)</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
           <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
             <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: colorPrimario }}><FileText size={20} /> Documentacion</h3>
             {operacion.legajo?.firmaUrl && !operacion.legajo?.contratoFinalPdf && puedeLiquidar && (
               <button onClick={compilarContratoFinal} disabled={generandoPdf} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
                 {generandoPdf ? <Loader2 className="animate-spin" size={16} /> : <FileSignature size={16} />} Compilar Legal
               </button>
             )}
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <p className="text-sm text-gray-400 mb-3">Firma Cruda:</p>
                {operacion.legajo?.firmaUrl ? <div className="bg-white rounded-lg p-2 max-w-sm border border-gray-700"><img src={operacion.legajo.firmaUrl} alt="Firma" className="w-full h-auto rounded" /></div> : <p className="text-gray-500 italic text-sm p-4 bg-[#111] rounded-lg border border-gray-800">Sin firma capturada.</p>}
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-3">Expediente Legal:</p>
                {operacion.legajo?.contratoFinalPdf ? (
                  <div className="p-6 bg-[#111] border border-green-900/50 rounded-xl text-center">
                    <FileText size={40} className="mx-auto text-green-500 mb-3" />
                    <p className="font-bold text-white mb-3">Documento Fusionado</p>
                    <a href={operacion.legajo.contratoFinalPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors text-sm">
                      <Download size={16} /> Descargar PDF
                    </a>
                  </div>
                ) : <div className="p-6 bg-[#111] border border-gray-800 rounded-xl text-center"><p className="text-gray-500 text-sm">Contrato pendiente.</p></div>}
              </div>
           </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 overflow-y-auto max-h-[400px]">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-gray-800 pb-3" style={{ color: colorPrimario }}><Activity size={20} /> Historial</h3>
          <div className="space-y-5">
            {logs.length === 0 ? <p className="text-gray-500 text-sm italic">No hay movimientos registrados.</p> : logs.map(log => (
              <div key={log.id} className="flex gap-3 items-start relative">
                <div className="mt-0.5 bg-gray-900 p-1.5 rounded-full text-gray-400 border border-gray-800 z-10"><Clock size={14} /></div>
                <div className="flex-1"><p className="text-sm font-bold text-white">{log.accion.replace(/_/g, " ")}</p><p className="text-xs text-gray-400 mt-0.5">{log.detalles}</p><p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{log.usuario}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {puedeLiquidar && (operacion.estado === "PENDIENTE_DOCS" || operacion.estado === "PENDIENTE_FIRMA_CLIENTE") && (
        <div className="bg-[#111] border border-gray-700 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div><h4 className="font-bold text-white mb-1">Resolucion del Legajo</h4><p className="text-sm text-gray-400">Verifica que el contrato este compilado antes de aprobar.</p></div>
          <div className="flex w-full md:w-auto gap-3">
            <button onClick={() => actualizarEstado("RECHAZADO")} disabled={procesando} className="flex-1 md:flex-none px-6 py-3 bg-red-950/50 hover:bg-red-900 border border-red-900 text-red-500 hover:text-white rounded-lg font-bold transition-colors disabled:opacity-50">Rechazar</button>
            <button onClick={() => actualizarEstado("LIQUIDADO")} disabled={procesando || !operacion.legajo?.contratoFinalPdf} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50">
              {procesando ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />} Aprobar y Liquidar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
