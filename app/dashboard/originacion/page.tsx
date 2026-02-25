"use client";

import { useRef, useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Save, Eraser, CheckCircle2, Loader2, User, CreditCard, PenTool, Search, ShieldCheck } from "lucide-react";

export default function OriginacionPage() {
  const { userData, entidadData } = useAuth();
  const router = useRouter();
  
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  
  const [dni, setDni] = useState("");
  const [genero, setGenero] = useState("M");
  const [nombre, setNombre] = useState("");
  const [cuilCalculado, setCuilCalculado] = useState("");
  const [scoreBcra, setScoreBcra] = useState<number | null>(null);
  
  const [monto, setMonto] = useState("100000");
  const [cuotas, setCuotas] = useState("12");
  const [tipoCredito, setTipoCredito] = useState("ADELANTO");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const calcularCuil = (dniStr: string, gen: string) => {
    if (!dniStr || dniStr.length < 7 || dniStr.length > 8) return "";
    const dniFormat = dniStr.padStart(8, '0');
    const prefijo = gen === 'M' ? '20' : gen === 'F' ? '27' : '23';
    const base = prefijo + dniFormat;
    const mults = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 10; i++) suma += parseInt(base[i]) * mults[i];
    const resto = suma % 11;
    let digito = 11 - resto;
    if (digito === 11) digito = 0;
    if (digito === 10) {
      if (gen === 'M') return '23' + dniFormat + '9';
      if (gen === 'F') return '23' + dniFormat + '4';
      digito = 9;
    }
    return base + digito;
  };

  const consultarBcra = () => {
    if (!dni || !nombre) {
      setErrorValidacion("Ingresa DNI y Nombre primero.");
      return;
    }
    setErrorValidacion("");
    setLoading(true);
    
    setTimeout(() => {
      const cuilGen = calcularCuil(dni, genero);
      setCuilCalculado(cuilGen);
      
      const scoreSimulado = Math.random() > 0.8 ? 2 : 1; 
      setScoreBcra(scoreSimulado);
      
      setLoading(false);
    }, 1500);
  };

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
    ctx.strokeStyle = entidadData?.configuracion?.colorPrimario || "#FF5E14";
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
    if (!canvasRef.current || !userData || !entidadData) {
      setMensaje("Faltan datos requeridos o error de sesion.");
      return;
    }
    
    setLoading(true);
    setMensaje("Subiendo firma y registrando legajo...");

    try {
      const firmaBase64 = canvasRef.current.toDataURL("image/png");

      const fileName = `firmas/${entidadData.id}/${dni}_${Date.now()}.png`;
      const storageRef = ref(storage, fileName);
      await uploadString(storageRef, firmaBase64, "data_url");
      const firmaUrl = await getDownloadURL(storageRef);

      const operacionRef = collection(db, "operaciones");
      await addDoc(operacionRef, {
        entidadId: entidadData.id,
        vendedorId: userData.uid,
        tipo: tipoCredito,
        estado: "PENDIENTE_DOCS",
        cliente: {
          dni,
          cuil: cuilCalculado,
          nombre,
          scoreBcra
        },
        financiero: {
          montoSolicitado: Number(monto),
          cuotas: Number(cuotas),
          cft: entidadData.configuracion?.tasaInteresBase || 0,
          fechaVencimiento: serverTimestamp()
        },
        legajo: { firmaUrl },
        seguridad: {
          userAgent: navigator.userAgent,
          hashOperacion: "GENERADO_EN_BACKEND"
        },
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp()
      });

      setMensaje("Operacion creada. Pasando a bandeja...");
      setTimeout(() => {
        router.push("/dashboard/operaciones");
      }, 2000);

    } catch (error) {
      console.error(error);
      setMensaje("Error al procesar la operacion.");
    } finally {
      setLoading(false);
    }
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8F9FA] p-6 lg:p-12 font-sans selection:bg-white selection:text-black">
      <div className="max-w-3xl mx-auto">
        
        <div className="mb-10 border-b border-gray-800 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Nuevo Legajo</h1>
            <p className="text-gray-400 font-medium">Originador Multi-Tenant v2.5.0</p>
          </div>
          <div className="text-right">
            <span className="text-xs bg-gray-900 text-gray-400 px-3 py-1 rounded-full border border-gray-800">
              Operador: {userData?.nombre}
            </span>
          </div>
        </div>

        {mensaje && (
          <div className="mb-6 p-4 rounded-xl bg-gray-900 border border-green-900 text-green-500 font-medium flex items-center gap-3">
            <CheckCircle2 size={20} />
            {mensaje}
          </div>
        )}

        {paso === 1 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg text-white" style={{ backgroundColor: colorPrimario }}><User size={24} /></div>
              <h2 className="text-xl font-bold">Paso 1: Identidad & Scoring</h2>
            </div>
            
            {errorValidacion && <p className="text-red-500 text-sm mb-4">{errorValidacion}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-1">Genero (P/ CUIL)</label>
                <select value={genero} onChange={(e) => setGenero(e.target.value)} disabled={scoreBcra !== null} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none transition-colors">
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">DNI Solicitante</label>
                <input type="number" value={dni} onChange={(e) => setDni(e.target.value)} disabled={scoreBcra !== null} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none transition-colors" placeholder="Ej: 30123456" />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={scoreBcra !== null} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none transition-colors" placeholder="Ej: Juan Perez" />
            </div>

            {!scoreBcra ? (
              <button onClick={consultarBcra} disabled={loading} className="w-full text-white font-bold py-3 rounded-lg transition-opacity hover:opacity-90 flex justify-center items-center gap-2" style={{ backgroundColor: colorPrimario }}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                {loading ? "Consultando Central de Deudores..." : "Calcular CUIL y Consultar BCRA"}
              </button>
            ) : (
              <div className="bg-[#111] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">CUIL Generado: <span className="text-white font-mono">{cuilCalculado}</span></p>
                  <div className="flex items-center gap-2 mt-1">
                    <ShieldCheck size={16} className="text-green-500" />
                    <span className="text-sm font-bold text-green-500">BCRA Situacion: {scoreBcra} (Apto)</span>
                  </div>
                </div>
                <button onClick={() => setPaso(2)} className="text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity" style={{ backgroundColor: colorPrimario }}>
                  Continuar
                </button>
              </div>
            )}
          </div>
        )}

        {paso === 2 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg text-white" style={{ backgroundColor: colorPrimario }}><CreditCard size={24} /></div>
              <h2 className="text-xl font-bold">Paso 2: Condiciones Comerciales</h2>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-1">Linea de Credito</label>
              <select value={tipoCredito} onChange={(e) => setTipoCredito(e.target.value)} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gray-500 transition-colors">
                {entidadData?.configuracion?.moduloAdelantos && <option value="ADELANTO">Adelanto (1 Pago / Pagos360)</option>}
                {entidadData?.configuracion?.moduloCuad && <option value="CUAD">Bono de Sueldo (CUAD Mendoza)</option>}
                {entidadData?.configuracion?.moduloPrivados && <option value="PRIVADO">Privados (Tradicional)</option>}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Monto ($)</label>
                <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gray-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Plazo</label>
                <select value={cuotas} onChange={(e) => setCuotas(e.target.value)} disabled={tipoCredito === 'ADELANTO'} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gray-500 transition-colors disabled:opacity-50">
                  <option value="1">1 Cuota (Adelanto)</option>
                  <option value="6">6 Cuotas</option>
                  <option value="12">12 Cuotas</option>
                  <option value="24">24 Cuotas</option>
                </select>
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <button onClick={() => setPaso(1)} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-lg transition-colors">Atras</button>
              <button onClick={() => setPaso(3)} className="flex-1 text-white font-bold py-3 rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: colorPrimario }}>Capturar Firma</button>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg text-white" style={{ backgroundColor: colorPrimario }}><PenTool size={24} /></div>
              <h2 className="text-xl font-bold">Paso 3: Firma de Aceptacion</h2>
            </div>
            
            <p className="text-sm text-gray-400 mb-4 font-medium">
              El titular {nombre} ({cuilCalculado}) acepta las condiciones por ${monto} bajo linea {tipoCredito}.
            </p>
            
            <div className="bg-[#F8F9FA] rounded-xl overflow-hidden border-2 border-gray-700 focus-within:border-gray-500 transition-colors mb-4 relative">
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
              <button onClick={limpiarFirma} className="flex items-center justify-center gap-2 flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-lg transition-colors">
                <Eraser size={20} /> Limpiar Trazo
              </button>
              <button onClick={liquidarOperacion} disabled={loading} className="flex items-center justify-center gap-2 flex-1 text-white font-bold py-3 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: colorPrimario }}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {loading ? "Subiendo..." : "Generar Legajo"}
              </button>
            </div>
            <div className="mt-4 text-center">
               <button onClick={() => setPaso(2)} className="text-sm text-gray-500 hover:text-white transition-colors">Volver a Simulacion</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
