"use client";

import { useRef, useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Save, Eraser, CheckCircle2, Loader2, User, CreditCard, PenTool, Search, ShieldCheck, Link as LinkIcon, Copy } from "lucide-react";

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
  
  const [linkGenerado, setLinkGenerado] = useState("");
  const [copiado, setCopiado] = useState(false);

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
      setCuilCalculado(calcularCuil(dni, genero));
      setScoreBcra(Math.random() > 0.8 ? 2 : 1);
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

  const generarOperacionBase = async (esRemoto: boolean) => {
    if (!userData || !entidadData) throw new Error("Datos de sesion faltantes");
    
    const operacionRef = await addDoc(collection(db, "operaciones"), {
      entidadId: entidadData.id,
      vendedorId: userData.uid,
      tipo: tipoCredito,
      estado: esRemoto ? "PENDIENTE_FIRMA_CLIENTE" : "PENDIENTE_DOCS",
      cliente: { dni, cuil: cuilCalculado, nombre, scoreBcra },
      financiero: {
        montoSolicitado: Number(monto),
        cuotas: Number(cuotas),
        cft: entidadData.configuracion?.tasaInteresBase || 0,
        fechaVencimiento: serverTimestamp()
      },
      legajo: { firmaUrl: "" },
      seguridad: {
        userAgent: navigator.userAgent,
        hashOperacion: "GENERADO_EN_BACKEND"
      },
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    });

    return operacionRef.id;
  };

  const liquidarPresencial = async () => {
    if (!canvasRef.current) return;
    setLoading(true);
    setMensaje("Subiendo firma y registrando legajo...");

    try {
      const operacionId = await generarOperacionBase(false);
      const firmaBase64 = canvasRef.current.toDataURL("image/png");
      const fileName = `firmas/${entidadData?.id}/${dni}_${Date.now()}.png`;
      const storageRef = ref(storage, fileName);
      await uploadString(storageRef, firmaBase64, "data_url");
      const firmaUrl = await getDownloadURL(storageRef);

      await setDoc(doc(db, "operaciones", operacionId), {
        legajo: { firmaUrl }
      }, { merge: true });

      setMensaje("Operacion creada con firma presencial.");
      setTimeout(() => router.push("/dashboard/operaciones"), 2000);
    } catch (error) {
      console.error(error);
      setMensaje("Error al procesar la operacion.");
    } finally {
      setLoading(false);
    }
  };

  const generarMagicLink = async () => {
    setLoading(true);
    setMensaje("Generando link seguro para el cliente...");

    try {
      const operacionId = await generarOperacionBase(true);
      const tokenUnico = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const expiracion = new Date();
      expiracion.setHours(expiracion.getHours() + 24);

      await setDoc(doc(db, "magic_links", tokenUnico), {
        token: tokenUnico,
        operacionId: operacionId,
        entidadId: entidadData?.id,
        usado: false,
        expiracion: expiracion,
        fechaCreacion: serverTimestamp()
      });

      const urlDestino = `${window.location.origin}/onboarding/${tokenUnico}`;
      setLinkGenerado(urlDestino);
      setPaso(4);
    } catch (error) {
      console.error(error);
      setMensaje("Error al generar el link.");
    } finally {
      setLoading(false);
    }
  };

  const copiarAlPortapapeles = () => {
    navigator.clipboard.writeText(linkGenerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8F9FA] p-6 lg:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 border-b border-gray-800 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Nuevo Legajo</h1>
            <p className="text-gray-400 font-medium">Originador Multi-Tenant v2.5.0</p>
          </div>
          <div className="text-right">
            <span className="text-xs bg-gray-900 text-gray-400 px-3 py-1 rounded-full border border-gray-800">Operador: {userData?.nombre}</span>
          </div>
        </div>

        {mensaje && paso !== 4 && (
          <div className="mb-6 p-4 rounded-xl bg-gray-900 border border-green-900 text-green-500 font-medium flex items-center gap-3">
            <CheckCircle2 size={20} />{mensaje}
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
                <input type="number" value={dni} onChange={(e) => setDni(e.target.value)} disabled={scoreBcra !== null} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none transition-colors" />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={scoreBcra !== null} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none transition-colors" />
            </div>

            {!scoreBcra ? (
              <button onClick={consultarBcra} disabled={loading} className="w-full text-white font-bold py-3 rounded-lg transition-opacity hover:opacity-90 flex justify-center items-center gap-2" style={{ backgroundColor: colorPrimario }}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />} Calcular CUIL y Consultar BCRA
              </button>
            ) : (
              <div className="bg-[#111] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">CUIL Generado: <span className="text-white font-mono">{cuilCalculado}</span></p>
                  <div className="flex items-center gap-2 mt-1"><ShieldCheck size={16} className="text-green-500" /><span className="text-sm font-bold text-green-500">BCRA Situacion: {scoreBcra}</span></div>
                </div>
                <button onClick={() => setPaso(2)} className="text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity" style={{ backgroundColor: colorPrimario }}>Continuar</button>
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
              <select value={tipoCredito} onChange={(e) => setTipoCredito(e.target.value)} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none transition-colors">
                {entidadData?.configuracion?.moduloAdelantos && <option value="ADELANTO">Adelanto (1 Pago)</option>}
                {entidadData?.configuracion?.moduloCuad && <option value="CUAD">CUAD Mendoza</option>}
                {entidadData?.configuracion?.moduloPrivados && <option value="PRIVADO">Privados</option>}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Monto ($)</label>
                <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Plazo</label>
                <select value={cuotas} onChange={(e) => setCuotas(e.target.value)} disabled={tipoCredito === 'ADELANTO'} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none transition-colors disabled:opacity-50">
                  <option value="1">1 Cuota</option>
                  <option value="6">6 Cuotas</option>
                  <option value="12">12 Cuotas</option>
                </select>
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <button onClick={() => setPaso(1)} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-lg transition-colors">Atras</button>
              <button onClick={() => setPaso(3)} className="flex-1 text-white font-bold py-3 rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: colorPrimario }}>Continuar a Firma</button>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg text-white" style={{ backgroundColor: colorPrimario }}><PenTool size={24} /></div>
              <h2 className="text-xl font-bold">Paso 3: Método de Captura</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-700 rounded-xl p-6 text-center hover:border-gray-500 transition-colors cursor-pointer" onClick={() => setPaso(5)}>
                <PenTool size={32} className="mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-bold text-white mb-2">Firma Presencial</h3>
                <p className="text-sm text-gray-500">El cliente está presente en la sucursal y firmará en esta pantalla.</p>
              </div>
              <div className="border border-gray-700 rounded-xl p-6 text-center hover:border-gray-500 transition-colors cursor-pointer" onClick={generarMagicLink}>
                <LinkIcon size={32} className="mx-auto mb-3" style={{ color: colorPrimario }} />
                <h3 className="text-lg font-bold text-white mb-2">Firma Remota (Link)</h3>
                <p className="text-sm text-gray-500">Generar un link único para enviar por WhatsApp al cliente.</p>
              </div>
            </div>
            
            <div className="mt-4 text-center">
               <button onClick={() => setPaso(2)} className="text-sm text-gray-500 hover:text-white transition-colors">Volver a Simulación</button>
            </div>
          </div>
        )}

        {paso === 4 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-green-950/30 flex items-center justify-center mx-auto mb-4 border border-green-900/50">
              <LinkIcon size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Link Generado Exitosamente</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">La operación ha sido pre-cargada. Envía este enlace al cliente para que valide su identidad y firme desde su celular.</p>
            
            <div className="bg-[#111] border border-gray-700 rounded-xl p-4 flex items-center justify-between mb-8 max-w-lg mx-auto">
              <span className="text-sm text-gray-300 font-mono truncate mr-4">{linkGenerado}</span>
              <button onClick={copiarAlPortapapeles} className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex gap-2 text-sm font-medium items-center">
                {copiado ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                {copiado ? "Copiado!" : "Copiar"}
              </button>
            </div>
            
            <button onClick={() => { setPaso(1); setDni(""); setNombre(""); setScoreBcra(null); }} className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
              ← Cargar otra operación
            </button>
          </div>
        )}

        {paso === 5 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <h2 className="text-xl font-bold mb-6">Firma Presencial</h2>
            <div className="bg-[#F8F9FA] rounded-xl overflow-hidden border-2 border-gray-700 focus-within:border-gray-500 transition-colors mb-4 relative">
              <canvas
                ref={canvasRef} width={700} height={250} className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseOut={stopDrawing} onMouseMove={draw}
                onTouchStart={startDrawing} onTouchEnd={stopDrawing} onTouchMove={draw}
              />
            </div>
            <div className="flex gap-4">
              <button onClick={limpiarFirma} className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-lg"><Eraser size={20} className="mx-auto" /></button>
              <button onClick={liquidarPresencial} disabled={loading} className="flex-[3] text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2" style={{ backgroundColor: colorPrimario }}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Confirmar y Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
