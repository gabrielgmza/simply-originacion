"use client";

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useParams } from "next/navigation";
import { Loader2, ShieldCheck, PenTool, Eraser, CheckCircle2, AlertTriangle } from "lucide-react";

export default function OnboardingClientePage() {
  const params = useParams();
  const token = params?.token as string;

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorStatus, setErrorStatus] = useState("");
  const [completado, setCompletado] = useState(false);
  
  const [entidad, setEntidad] = useState<any>(null);
  const [operacion, setOperacion] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const validarLink = async () => {
      if (!token) return;
      try {
        const linkRef = doc(db, "magic_links", token);
        const linkSnap = await getDoc(linkRef);

        if (!linkSnap.exists()) {
          setErrorStatus("Link invalido o no encontrado.");
          return;
        }

        const linkData = linkSnap.data();
        if (linkData.usado) {
          setErrorStatus("Este enlace ya fue utilizado para firmar.");
          return;
        }

        if (new Date() > new Date(linkData.expiracion.seconds * 1000)) {
          setErrorStatus("Este enlace ha caducado por seguridad.");
          return;
        }

        const entRef = doc(db, "entidades", linkData.entidadId);
        const entSnap = await getDoc(entRef);
        if (entSnap.exists()) setEntidad(entSnap.data());

        const opRef = doc(db, "operaciones", linkData.operacionId);
        const opSnap = await getDoc(opRef);
        if (opSnap.exists()) setOperacion({ id: opSnap.id, ...opSnap.data() });

      } catch (error) {
        console.error("Error al validar token:", error);
        setErrorStatus("Error de conexion segura.");
      } finally {
        setCargando(false);
      }
    };

    validarLink();
  }, [token]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true); draw(e);
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) canvasRef.current.getContext("2d")?.beginPath();
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = entidad?.configuracion?.colorPrimario || "#FF5E14";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const limpiarFirma = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const confirmarFirma = async () => {
    if (!canvasRef.current || !operacion) return;
    setProcesando(true);

    try {
      const firmaBase64 = canvasRef.current.toDataURL("image/png");
      const fileName = `firmas/${entidad?.id || 'temp'}/${operacion.cliente.dni}_${Date.now()}.png`;
      const storageRef = ref(storage, fileName);
      await uploadString(storageRef, firmaBase64, "data_url");
      const firmaUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "operaciones", operacion.id), {
        "legajo.firmaUrl": firmaUrl,
        estado: "PENDIENTE_DOCS",
        "seguridad.ipAddress": "Capturada",
        "seguridad.deviceFingerprint": navigator.userAgent,
        fechaActualizacion: serverTimestamp()
      });

      await updateDoc(doc(db, "magic_links", token), { usado: true });

      setCompletado(true);
    } catch (error) {
      console.error(error);
      alert("Error al procesar la firma. Reintente.");
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={40} /></div>;

  if (errorStatus) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-t-4 border-red-500">
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
        <p className="text-gray-600">{errorStatus}</p>
      </div>
    </div>
  );

  if (completado) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-t-4" style={{ borderColor: entidad?.configuracion?.colorPrimario || "#10B981" }}>
        <CheckCircle2 size={56} className="mx-auto mb-4" style={{ color: entidad?.configuracion?.colorPrimario || "#10B981" }} />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Proceso Completado!</h2>
        <p className="text-gray-600">Tu firma ha sido registrada de forma segura. Ya puedes cerrar esta ventana y el asesor continuará con el trámite.</p>
      </div>
    </div>
  );

  const colorPrimario = entidad?.configuracion?.colorPrimario || "#FF5E14";
  const formatearMoneda = (monto: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <header className="bg-white shadow-sm p-4 text-center border-b-4" style={{ borderColor: colorPrimario }}>
        <h1 className="text-xl font-bold" style={{ color: colorPrimario }}>{entidad?.nombreFantasia}</h1>
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1"><ShieldCheck size={14} /> Entorno Seguro y Encriptado</p>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full flex flex-col justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Resumen de Operación</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Titular</span><span className="font-bold">{operacion.cliente.nombre}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">CUIL</span><span className="font-mono">{operacion.cliente.cuil}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Monto Solicitado</span><span className="font-bold text-lg" style={{ color: colorPrimario }}>{formatearMoneda(operacion.financiero.montoSolicitado)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Plan de Pagos</span><span className="font-bold">{operacion.financiero.cuotas} cuotas</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <PenTool size={24} className="mx-auto mb-2 text-gray-400" />
          <h3 className="font-bold mb-4">Firma Digital Requerida</h3>
          <p className="text-xs text-gray-500 mb-4">Por favor, dibuja tu firma en el recuadro inferior para dar conformidad a los términos comerciales.</p>
          
          <div className="bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 mb-4">
            <canvas
              ref={canvasRef} width={400} height={200} className="w-full cursor-crosshair touch-none bg-transparent"
              onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseOut={stopDrawing} onMouseMove={draw}
              onTouchStart={startDrawing} onTouchEnd={stopDrawing} onTouchMove={draw}
            />
          </div>

          <div className="flex gap-3">
            <button onClick={limpiarFirma} className="p-3 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"><Eraser size={20} /></button>
            <button onClick={confirmarFirma} disabled={procesando} className="flex-1 text-white rounded-lg font-bold shadow-md opacity-90 hover:opacity-100 disabled:opacity-50 flex justify-center items-center gap-2" style={{ backgroundColor: colorPrimario }}>
              {procesando ? <Loader2 className="animate-spin" size={20} /> : "Confirmar Firma"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
