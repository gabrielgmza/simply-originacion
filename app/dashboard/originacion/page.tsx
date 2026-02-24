"use client";

import { useRef, useState, useEffect } from "react";
import { Save, Eraser, CheckCircle2, Loader2, User, CreditCard, PenTool } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function OriginacionPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  
  // Estado del Formulario
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("100000");
  const [cuotas, setCuotas] = useState("12");

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Inicializar Canvas
  useEffect(() => {
    if (paso === 3 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#F8F9FA"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [paso]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#FF5E14"; // UENA Orange
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const limpiarFirma = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#F8F9FA";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const liquidarOperacion = async () => {
    if (!canvasRef.current || !dni || !nombre) {
      setMensaje("Faltan datos requeridos.");
      return;
    }
    
    setLoading(true);
    setMensaje("Procesando firma y guardando operación...");

    try {
      // 1. Capturar Firma a Base64
      const firmaBase64 = canvasRef.current.toDataURL("image/png");

      // 2. Subir a Firebase Storage
      const fileName = `firmas/${dni}_${Date.now()}.png`;
      const storageRef = ref(storage, fileName);
      await uploadString(storageRef, firmaBase64, "data_url");
      const firmaUrl = await getDownloadURL(storageRef);

      // 3. Guardar en Firestore
      const currentUser = auth.currentUser;
      const operacionRef = collection(db, "operaciones");
      await addDoc(operacionRef, {
        clienteNombre: nombre,
        clienteDni: dni,
        monto: Number(monto),
        cuotas: Number(cuotas),
        entidadNombre: "Entidad UENA", // Parametrizable futuro
        estado: "PENDIENTE",
        fechaCreacion: serverTimestamp(),
        vendedor: currentUser?.email || "operador@local",
        firmaUrl: firmaUrl
      });

      setMensaje("¡Operación liquidada con éxito!");
      setTimeout(() => {
        router.push("/dashboard/operaciones");
      }, 2000);

    } catch (error) {
      console.error(error);
      setMensaje("Error al procesar la operación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8F9FA] p-6 lg:p-12 font-sans selection:bg-[#FF5E14] selection:text-white">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Originación Crediticia</h1>
          <p className="text-gray-400 font-medium">Versión 1.1.4 (Elite Minimal) - Completar los 3 pasos.</p>
        </div>

        {/* Notificaciones */}
        {mensaje && (
          <div className="mb-6 p-4 rounded-xl bg-gray-900 border border-[#FF5E14] text-[#FF5E14] font-medium flex items-center gap-3">
            <CheckCircle2 size={20} />
            {mensaje}
          </div>
        )}

        {/* Paso 1: Identidad */}
        {paso === 1 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#FF5E14] p-2 rounded-lg text-white"><User size={24} /></div>
              <h2 className="text-xl font-bold">Paso 1: Consulta de Identidad</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">DNI del Solicitante</label>
                <input 
                  type="number" 
                  value={dni} 
                  onChange={(e) => setDni(e.target.value)} 
                  className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#FF5E14] transition-colors"
                  placeholder="Ej: 30123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#FF5E14] transition-colors"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <button 
                onClick={() => { if(dni && nombre) setPaso(2); else setMensaje("Complete los datos."); }}
                className="w-full mt-4 bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                Continuar a Simulación
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Simulación */}
        {paso === 2 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#FF5E14] p-2 rounded-lg text-white"><CreditCard size={24} /></div>
              <h2 className="text-xl font-bold">Paso 2: Simulación Bancaria</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Monto Solicitado ($)</label>
                <input 
                  type="number" 
                  value={monto} 
                  onChange={(e) => setMonto(e.target.value)} 
                  className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#FF5E14] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Plazo (Cuotas)</label>
                <select 
                  value={cuotas} 
                  onChange={(e) => setCuotas(e.target.value)} 
                  className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#FF5E14] transition-colors"
                >
                  <option value="6">6 Cuotas</option>
                  <option value="12">12 Cuotas</option>
                  <option value="18">18 Cuotas</option>
                  <option value="24">24 Cuotas</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setPaso(1)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">Atrás</button>
              <button onClick={() => setPaso(3)} className="flex-1 bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold py-3 rounded-lg transition-colors">Capturar Firma</button>
            </div>
          </div>
        )}

        {/* Paso 3: Firma Táctil */}
        {paso === 3 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#FF5E14] p-2 rounded-lg text-white"><PenTool size={24} /></div>
              <h2 className="text-xl font-bold">Paso 3: Firma de Aceptación</h2>
            </div>
            
            <p className="text-sm text-gray-400 mb-4 font-medium">El cliente {nombre} (DNI: {dni}) acepta las condiciones por el monto de ${monto} en {cuotas} cuotas.</p>
            
            <div className="bg-white rounded-xl overflow-hidden border-2 border-dashed border-gray-600 focus-within:border-[#FF5E14] transition-colors mb-4 relative">
              <canvas
                ref={canvasRef}
                width={700}
                height={250}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={limpiarFirma} 
                className="flex items-center justify-center gap-2 flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                <Eraser size={20} /> Limpiar Trazo
              </button>
              <button 
                onClick={liquidarOperacion} 
                disabled={loading}
                className="flex items-center justify-center gap-2 flex-1 bg-[#FF5E14] hover:bg-[#E04D0B] disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {loading ? "Procesando..." : "Liquidar Operación"}
              </button>
            </div>
            <div className="mt-4 text-center">
               <button onClick={() => setPaso(2)} className="text-sm text-gray-500 hover:text-white transition-colors">Volver a Simulación</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
