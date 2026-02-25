"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle, FileText, User, CreditCard, ShieldCheck } from "lucide-react";

export default function LegajoDetalle() {
  const { userData, entidadData } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const [operacion, setOperacion] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const cargarOperacion = async () => {
      if (!userData || !params?.id) return;
      setCargando(true);
      try {
        const docRef = doc(db, "operaciones", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().entidadId === userData.entidadId) {
          setOperacion({ id: docSnap.id, ...docSnap.data() });
        } else {
          router.push("/dashboard/operaciones");
        }
      } catch (error) {
        console.error("Error al cargar legajo:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarOperacion();
  }, [userData, params.id, router]);

  const actualizarEstado = async (nuevoEstado: string) => {
    if (!operacion || procesando) return;
    setProcesando(true);
    try {
      const docRef = doc(db, "operaciones", operacion.id);
      await updateDoc(docRef, {
        estado: nuevoEstado,
        fechaActualizacion: serverTimestamp()
      });
      setOperacion({ ...operacion, estado: nuevoEstado });
    } catch (error) {
      console.error("Error al actualizar:", error);
    } finally {
      setProcesando(false);
    }
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto || 0);
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const puedeLiquidar = userData?.rol.includes("GERENTE") || userData?.rol === "LIQUIDADOR";

  if (cargando) return <div className="p-8 flex justify-center mt-20"><Loader2 className="animate-spin text-gray-500" size={40} /></div>;
  if (!operacion) return null;

  return (
    <div className="p-6 lg:p-12 max-w-5xl mx-auto animate-fade-in text-[#F8F9FA] font-sans">
      <div className="mb-6">
        <button onClick={() => router.push("/dashboard/operaciones")} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Volver a Operaciones
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Legajo Digital
          </h1>
          <p className="text-gray-400 text-sm font-mono bg-gray-900 px-3 py-1 rounded inline-block border border-gray-800">
            ID: {operacion.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Estado actual:</span>
          {operacion.estado === "LIQUIDADO" && <span className="flex items-center gap-1 px-3 py-1.5 bg-green-950/30 text-green-500 border border-green-900/50 rounded-full text-sm font-bold"><CheckCircle size={16}/> Liquidado</span>}
          {operacion.estado === "RECHAZADO" && <span className="flex items-center gap-1 px-3 py-1.5 bg-red-950/30 text-red-500 border border-red-900/50 rounded-full text-sm font-bold"><AlertTriangle size={16}/> Rechazado</span>}
          {operacion.estado === "PENDIENTE_DOCS" && <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-950/30 text-yellow-500 border border-yellow-900/50 rounded-full text-sm font-bold"><Clock size={16}/> Pendiente</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-gray-800 pb-3" style={{ color: colorPrimario }}>
            <User size={20} /> Identidad del Titular
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Nombre Completo</p>
              <p className="font-medium text-lg">{operacion.cliente?.nombre}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">CUIL Validado</p>
                <p className="font-mono text-gray-300">{operacion.cliente?.cuil}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Score BCRA</p>
                <p className="flex items-center gap-2 text-green-500 font-bold">
                  <ShieldCheck size={16} /> Situación {operacion.cliente?.scoreBcra || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-gray-800 pb-3" style={{ color: colorPrimario }}>
            <CreditCard size={20} /> Condiciones Comerciales
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Línea de Crédito / Producto</p>
              <p className="font-medium">{operacion.tipo}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Capital Solicitado</p>
                <p className="font-bold text-xl text-white">{formatearMoneda(operacion.financiero?.montoSolicitado)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Plan de Pagos</p>
                <p className="font-medium text-gray-300">{operacion.financiero?.cuotas} Cuota(s)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 mb-8">
         <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-gray-800 pb-3" style={{ color: colorPrimario }}>
            <FileText size={20} /> Documentación y Firma
         </h3>
         
         <div className="mt-4">
            <p className="text-sm text-gray-400 mb-3">Firma Digital Capturada:</p>
            {operacion.legajo?.firmaUrl ? (
              <div className="bg-white rounded-lg p-2 max-w-sm border border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={operacion.legajo.firmaUrl} alt="Firma del Titular" className="w-full h-auto rounded" />
              </div>
            ) : (
              <p className="text-gray-500 italic text-sm">Firma no disponible en este legajo.</p>
            )}
         </div>
      </div>

      {puedeLiquidar && operacion.estado === "PENDIENTE_DOCS" && (
        <div className="bg-[#111] border border-gray-700 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="font-bold text-white mb-1">Resolución del Legajo</h4>
            <p className="text-sm text-gray-400">Verifica cuidadosamente los datos antes de aprobar el desembolso.</p>
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <button 
              onClick={() => actualizarEstado("RECHAZADO")}
              disabled={procesando}
              className="flex-1 md:flex-none px-6 py-3 bg-red-950/50 hover:bg-red-900 border border-red-900 text-red-500 hover:text-white rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              Rechazar
            </button>
            <button 
              onClick={() => actualizarEstado("LIQUIDADO")}
              disabled={procesando}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {procesando ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
              Aprobar y Liquidar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
