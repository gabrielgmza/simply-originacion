"use client";

import { useRef, useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Save, Eraser, CheckCircle2, Loader2, User, CreditCard, PenTool, Search, ShieldCheck, Link as LinkIcon, Copy, Lock, FileCheck, AlertTriangle } from "lucide-react";

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
  
  const [bcraInfo, setBcraInfo] = useState<any>(null);
  
  const [monto, setMonto] = useState("100000");
  const [cuotas, setCuotas] = useState("12");
  const [tipoCredito, setTipoCredito] = useState("ADELANTO");
  
  const [cupoDisponible, setCupoDisponible] = useState<number | null>(null);
  const [consultandoCupo, setConsultandoCupo] = useState(false);
  const [cupoTomado, setCupoTomado] = useState(false);
  const [bloqueandoCupo, setBloqueandoCupo] = useState(false);
  
  const [linkGenerado, setLinkGenerado] = useState("");
  const [copiado, setCopiado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (paso === 3 && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) { ctx.fillStyle = "#F8F9FA"; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
    }
  }, [paso]);

  useEffect(() => {
    setCupoDisponible(null); setCupoTomado(false); setErrorValidacion("");
  }, [tipoCredito]);

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

  const consultarBcra = async () => {
    if (!dni || !nombre) {
      setErrorValidacion("Ingresa DNI y Nombre primero.");
      return;
    }
    setErrorValidacion("");
    setLoading(true);
    
    try {
      const cuilGen = calcularCuil(dni, genero);
      setCuilCalculado(cuilGen);

      const res = await fetch("/api/bcra/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuil: cuilGen })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setBcraInfo(data);
    } catch (error: any) {
      console.error(error);
      setErrorValidacion("Error al conectar con la Central de Deudores BCRA.");
    } finally {
      setLoading(false);
    }
  };

  const consultarCupoCuad = async () => {
    setConsultandoCupo(true); setErrorValidacion("");
    try {
      const res = await fetch("/api/cuad/consultar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni, entidadId: entidadData?.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.estado === "APTO") {
        setCupoDisponible(data.cupoDisponible); setMonto(data.cupoDisponible.toString());
        setMensaje(`Lectura exitosa. Margen: $${data.cupoDisponible}`);
        setTimeout(() => setMensaje(""), 4000);
      } else setErrorValidacion("El cliente NO posee margen de descuento.");
    } catch (error: any) { setErrorValidacion(error.message); } finally { setConsultandoCupo(false); }
  };

  const bloquearCupo = () => {
    if (Number(monto) > (cupoDisponible || 0)) { setErrorValidacion("El monto supera el cupo."); return; }
    setErrorValidacion(""); setBloqueandoCupo(true);
    setTimeout(() => {
      setCupoTomado(true); setBloqueandoCupo(false);
      setMensaje(`Se han bloqueado $${monto} y se descargo el CAD.`);
    }, 2500);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => { setIsDrawing(true); draw(e); };
  const stopDrawing = () => { setIsDrawing(false); if (canvasRef.current) canvasRef.current.getContext("2d")?.beginPath(); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = entidadData?.configuracion?.colorPrimario || "#FF5E14";
    ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke(); ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };
  const limpiarFirma = () => { if (!canvasRef.current) return; const ctx = canvasRef.current.getContext("2d"); if (ctx) { ctx.fillStyle = "#F8F9FA"; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height); } };

  const generarOperacionBase = async (esRemoto: boolean) => {
    if (!userData || !entidadData) throw new Error("Datos de sesion faltantes");
    const operacionRef = await addDoc(collection(db, "operaciones"), {
      entidadId: entidadData.id, vendedorId: userData.uid, tipo: tipoCredito,
      estado: esRemoto ? "PENDIENTE_FIRMA_CLIENTE" : "PENDIENTE_DOCS",
      cliente: { dni, cuil: cuilCalculado, nombre, scoreBcra: bcraInfo?.situacionCrediticia || 1, bcraData: bcraInfo },
      financiero: { montoSolicitado: Number(monto), cuotas: Number(cuotas), cft: entidadData.configuracion?.tasaInteresBase || 0, fechaVencimiento: serverTimestamp() },
      legajo: { firmaUrl: "", cadUrl: tipoCredito === 'CUAD' && cupoTomado ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" : null },
      seguridad: { userAgent: navigator.userAgent, hashOperacion: "GENERADO_EN_BACKEND" },
      fechaCreacion: serverTimestamp(), fechaActualizacion: serverTimestamp()
    });
    return operacionRef.id;
  };

  const liquidarPresencial = async () => {
    if (!canvasRef.current) return;
    setLoading(true); setMensaje("Subiendo firma...");
    try {
      const operacionId = await generarOperacionBase(false);
      const firmaBase64 = canvasRef.current.toDataURL("image/png");
      const storageRef = ref(storage, `firmas/${entidadData?.id}/${dni}_${Date.now()}.png`);
      await uploadString(storageRef, firmaBase64, "data_url");
      await setDoc(doc(db, "operaciones", operacionId), { legajo: { firmaUrl: await getDownloadURL(storageRef) } }, { merge: true });
      setMensaje("Operacion creada."); setTimeout(() => router.push("/dashboard/operaciones"), 2000);
    } catch (error) { setMensaje("Error al procesar."); } finally { setLoading(false); }
  };

  const generarMagicLink = async () => {
    setLoading(true); setMensaje("Generando link...");
    try {
      const operacionId = await generarOperacionBase(true);
      const tokenUnico = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiracion = new Date(); expiracion.setHours(expiracion.getHours() + 24);
      await setDoc(doc(db, "magic_links", tokenUnico), { token: tokenUnico, operacionId: operacionId, entidadId: entidadData?.id, usado: false, expiracion: expiracion, fechaCreacion: serverTimestamp() });
      setLinkGenerado(`${window.location.origin}/onboarding/${tokenUnico}`); setPaso(4);
    } catch (error) { setMensaje("Error al generar el link."); } finally { setLoading(false); }
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const formatearMoneda = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8F9FA] p-6 lg:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 border-b border-gray-800 pb-6 flex justify-between items-end">
          <div><h1 className="text-3xl font-bold tracking-tight text-white mb-2">Nuevo Legajo</h1><p className="text-gray-400 font-medium">Originador Multi-Tenant BCRA</p></div>
          <div className="text-right"><span className="text-xs bg-gray-900 text-gray-400 px-3 py-1 rounded-full border border-gray-800">Operador: {userData?.nombre}</span></div>
        </div>

        {mensaje && paso !== 4 && <div className="mb-6 p-4 rounded-xl bg-gray-900 border border-green-900 text-green-500 font-medium flex items-center gap-3"><CheckCircle2 size={20} />{mensaje}</div>}
        {errorValidacion && <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-500 font-medium flex items-center gap-3"><AlertTriangle size={20} />{errorValidacion}</div>}

        {paso === 1 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg text-white" style={{ backgroundColor: colorPrimario }}><User size={24} /></div>
              <h2 className="text-xl font-bold">Paso 1: Identidad & Scoring Oficial</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-400 mb-1">Genero</label><select value={genero} onChange={(e) => setGenero(e.target.value)} disabled={bcraInfo !== null} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none"><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-400 mb-1">DNI Solicitante</label><input type="number" value={dni} onChange={(e) => setDni(e.target.value)} disabled={bcraInfo !== null} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none" /></div>
            </div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label><input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={bcraInfo !== null} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none" /></div>

            {!bcraInfo ? (
              <button onClick={consultarBcra} disabled={loading} className="w-full text-white font-bold py-3 rounded-lg transition-opacity hover:opacity-90 flex justify-center items-center gap-2" style={{ backgroundColor: colorPrimario }}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />} Validar en BCRA
              </button>
            ) : (
              <div className="bg-[#111] border border-gray-800 p-5 rounded-xl">
                <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-4">
                  <div>
                    <p className="text-sm text-gray-400">CUIL: <span className="text-white font-mono">{cuilCalculado}</span></p>
                    <p className="text-sm text-gray-400">Nombre BCRA: <span className="text-white font-medium">{bcraInfo.denominacionBCRA}</span></p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${bcraInfo.situacionCrediticia <= 2 ? 'bg-green-950/30 text-green-500 border-green-900/50' : 'bg-red-950/30 text-red-500 border-red-900/50'}`}>
                      {bcraInfo.situacionCrediticia <= 2 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                      Sit. Crediticia: {bcraInfo.situacionCrediticia}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><p className="text-xs text-gray-500">Deuda Sist. Financiero</p><p className="font-bold">{formatearMoneda(bcraInfo.montoDeudaInformada)}</p></div>
                  <div><p className="text-xs text-gray-500">Cheques Rechazados</p><p className={`font-bold ${bcraInfo.tieneChequesRechazados ? 'text-red-500' : 'text-green-500'}`}>{bcraInfo.tieneChequesRechazados ? "SI REGISTRA" : "No registra"}</p></div>
                </div>
                <button onClick={() => setPaso(2)} className="w-full text-white py-3 rounded-lg font-bold hover:opacity-90 transition-opacity" style={{ backgroundColor: colorPrimario }}>Avanzar con la Operación</button>
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
            <div className="mb-6"><label className="block text-sm font-medium text-gray-400 mb-1">Linea de Credito</label><select value={tipoCredito} onChange={(e) => setTipoCredito(e.target.value)} disabled={cupoTomado} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none disabled:opacity-50">{entidadData?.configuracion?.moduloAdelantos && <option value="ADELANTO">Adelanto (1 Pago)</option>}{entidadData?.configuracion?.moduloCuad && <option value="CUAD">CUAD Mendoza</option>}{entidadData?.configuracion?.moduloPrivados && <option value="PRIVADO">Privados</option>}</select></div>
            
            {tipoCredito === 'CUAD' && cupoDisponible === null && (
              <div className="mb-6 p-6 border border-dashed border-gray-700 rounded-xl text-center">
                <button onClick={consultarCupoCuad} disabled={consultandoCupo} className="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto disabled:opacity-50">{consultandoCupo ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />} Consultar Cupo Gobierno</button>
              </div>
            )}

            {((tipoCredito === 'CUAD' && cupoDisponible !== null) || tipoCredito !== 'CUAD') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-400 mb-1">Monto ($)</label><input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} disabled={cupoTomado} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none disabled:opacity-50" /></div>
                  <div><label className="block text-sm font-medium text-gray-400 mb-1">Plazo</label><select value={cuotas} onChange={(e) => setCuotas(e.target.value)} disabled={tipoCredito === 'ADELANTO' || cupoTomado} className="w-full bg-[#111] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none disabled:opacity-50"><option value="1">1 Cuota</option><option value="6">6 Cuotas</option><option value="12">12 Cuotas</option></select></div>
                </div>
                {tipoCredito === 'CUAD' && !cupoTomado && <button onClick={bloquearCupo} disabled={bloqueandoCupo} className="w-full mt-6 bg-yellow-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2">{bloqueandoCupo ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />} Bloquear Cupo</button>}
                {cupoTomado && <div className="mt-6 bg-green-950/30 border border-green-900/50 rounded-xl p-4 flex justify-between"><div className="flex gap-3"><FileCheck className="text-green-500" size={24} /><div><p className="text-sm font-bold text-green-500">CAD Generado</p></div></div></div>}
                <div className="mt-8 flex gap-4"><button onClick={() => setPaso(1)} className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-lg">Atras</button><button onClick={() => setPaso(3)} disabled={tipoCredito === 'CUAD' && !cupoTomado} className="flex-1 text-white font-bold py-3 rounded-lg disabled:opacity-30" style={{ backgroundColor: colorPrimario }}>Continuar a Firma</button></div>
              </>
            )}
          </div>
        )}

        {paso === 3 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <h2 className="text-xl font-bold mb-6">Paso 3: Metodo de Firma</h2>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-700 rounded-xl p-6 text-center cursor-pointer" onClick={() => setPaso(5)}><PenTool size={32} className="mx-auto mb-3" /><h3 className="font-bold">Presencial</h3></div>
              <div className="border border-gray-700 rounded-xl p-6 text-center cursor-pointer" onClick={generarMagicLink}><LinkIcon size={32} className="mx-auto mb-3" style={{ color: colorPrimario }}/><h3 className="font-bold">Remoto (Link)</h3></div>
            </div>
            <button onClick={() => setPaso(2)} className="w-full text-sm text-gray-500">Volver</button>
          </div>
        )}

        {paso === 4 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 text-center animate-fade-in">
            <LinkIcon size={32} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-4">Link Generado</h2>
            <div className="bg-[#111] p-4 rounded-xl flex justify-between items-center mb-6"><span className="text-sm font-mono truncate mr-4">{linkGenerado}</span><button onClick={copiarAlPortapapeles} className="p-2 bg-gray-800 rounded-lg">{copiado ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}</button></div>
            <button onClick={() => { setPaso(1); setBcraInfo(null); setDni(""); }} className="text-sm text-gray-500">Nueva Operacion</button>
          </div>
        )}

        {paso === 5 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in">
            <h2 className="text-xl font-bold mb-6">Firma Titular</h2>
            <div className="bg-[#F8F9FA] rounded-xl overflow-hidden border-2 border-gray-700 mb-4"><canvas ref={canvasRef} width={700} height={250} className="w-full cursor-crosshair touch-none" onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseOut={stopDrawing} onMouseMove={draw} onTouchStart={startDrawing} onTouchEnd={stopDrawing} onTouchMove={draw}/></div>
            <div className="flex gap-4"><button onClick={limpiarFirma} className="flex-1 bg-gray-900 py-3 rounded-lg"><Eraser className="mx-auto"/></button><button onClick={liquidarPresencial} disabled={loading} className="flex-[3] py-3 rounded-lg font-bold flex justify-center items-center gap-2" style={{ backgroundColor: colorPrimario }}>{loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Guardar</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
