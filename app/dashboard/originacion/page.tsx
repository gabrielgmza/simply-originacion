"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, Eraser, CheckCircle2, Loader2, User, CreditCard, PenTool, Search, Link as LinkIcon, Copy, AlertTriangle, Building2, MapPin, Phone } from "lucide-react";

function OriginacionPageInner() {
  const { userData, entidadData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  const [vieneDeLead, setVieneDeLead] = useState(false);

  const [cliente, setCliente] = useState({
    dni: "", genero: "M", primerNombre: "", segundoNombre: "",
    apellidoPaterno: "", apellidoMaterno: "", cuil: "", email: "",
    telefono: "", domicilio: "", localidad: "", provincia: "",
    codigoPostal: "", banco: "", cbu: "", alias: "",
    lugarTrabajo: "", telefonoLaboral: "", estadoCivil: "SOLTERO"
  });

  const [bcraInfo, setBcraInfo] = useState<any>(null);
  const [monto, setMonto] = useState("100000");
  const [cuotas, setCuotas] = useState("12");
  const [tipoCredito, setTipoCredito] = useState("ADELANTO");
  const [linkGenerado, setLinkGenerado] = useState("");
  const [copiado, setCopiado] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Pre-llenado desde lead
  useEffect(() => {
    const leadId = searchParams.get("leadId");
    if (!leadId) return;
    const cargar = async () => {
      try {
        const snap = await getDoc(doc(db, "leads", leadId));
        if (!snap.exists()) return;
        const lead = snap.data() as any;
        const p = (lead.nombre || "").trim().split(" ");
        setCliente(prev => ({
          ...prev,
          dni:             lead.dni       || prev.dni,
          genero:          lead.sexo      || prev.genero,
          cuil:            lead.cuil      || prev.cuil,
          primerNombre:    p[0]           || prev.primerNombre,
          segundoNombre:   p[1]           || prev.segundoNombre,
          apellidoPaterno: p[2]           || prev.apellidoPaterno,
          apellidoMaterno: p[3]           || prev.apellidoMaterno,
          telefono:        lead.telefono  || prev.telefono,
          email:           lead.email     || prev.email,
        }));
        if (lead.simulacion?.monto)  setMonto(String(lead.simulacion.monto));
        if (lead.simulacion?.cuotas) setCuotas(String(lead.simulacion.cuotas));
        if (lead.bcra) setBcraInfo({ situacionCrediticia: lead.bcra.situacion || 1, denominacionBCRA: lead.bcra.nombre || lead.nombre, montoDeudaInformada: 0 });
        await updateDoc(doc(db, "leads", leadId), { estado: "EN_PROCESO", fechaActualizacion: serverTimestamp() });
        setVieneDeLead(true);
      } catch (e) { console.error("[Lead prefill]", e); }
    };
    cargar();
  }, []);

  const verificarDuplicado = async (dni: string) => {
    const snap = await getDocs(query(collection(db, "operaciones"), where("entidadId", "==", entidadData?.id), where("cliente.dni", "==", dni)));
    return !snap.empty;
  };

  const calcularCuil = (dni: string, gen: string) => {
    const d = dni.padStart(8, "0");
    let pre = gen === "M" ? "20" : "27";
    const mult = [5,4,3,2,7,6,5,4,3,2];
    let base = pre + d, suma = 0;
    for (let i = 0; i < 10; i++) suma += parseInt(base[i]) * mult[i];
    let dig = 11 - (suma % 11);
    if (dig === 11) dig = 0;
    if (dig === 10) { pre = "23"; dig = gen === "M" ? 9 : 4; base = pre + d; }
    return base + String(dig);
  };

  const consultarBcra = async () => {
    if (!cliente.dni || !cliente.apellidoPaterno) { setErrorValidacion("DNI y Apellido son obligatorios."); return; }
    setErrorValidacion(""); setLoading(true);
    try {
      if (await verificarDuplicado(cliente.dni)) { setErrorValidacion("Ya existe una operación activa para este DNI."); return; }
      const cuilGen = calcularCuil(cliente.dni, cliente.genero);
      setCliente(prev => ({ ...prev, cuil: cuilGen }));
      const res = await fetch("/api/bcra/consultar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cuil: cuilGen }) });
      setBcraInfo(await res.json());
    } catch { setErrorValidacion("Error de conexión BCRA."); }
    finally { setLoading(false); }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => { setIsDrawing(true); draw(e); };
  const stopDrawing = () => { setIsDrawing(false); canvasRef.current?.getContext("2d")?.beginPath(); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = colorPrimario;
    ctx.lineTo(cx - rect.left, cy - rect.top); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - rect.left, cy - rect.top);
  };
  const limpiarFirma = () => { const ctx = canvasRef.current?.getContext("2d"); if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); };

  const guardarOperacion = async () => {
    setLoading(true);
    try {
      let firmaUrl = "";
      if (canvasRef.current) {
        const b64 = canvasRef.current.toDataURL("image/png");
        const sr = ref(storage, `firmas/${entidadData?.id}/${cliente.dni}_${Date.now()}.png`);
        await uploadString(sr, b64, "data_url");
        firmaUrl = await getDownloadURL(sr);
      }
      const opRef = await addDoc(collection(db, "operaciones"), {
        entidadId: entidadData?.id, vendedorId: userData?.uid, tipo: tipoCredito, estado: "EN_REVISION",
        cliente: { ...cliente, nombre: `${cliente.primerNombre} ${cliente.apellidoPaterno}`.trim() },
        financiero: { montoSolicitado: parseFloat(monto), cuotas: parseInt(cuotas), cft: 0, fechaVencimiento: null },
        legajo: { firmaUrl }, seguridad: { userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "" },
        leadId: searchParams.get("leadId") || null,
        fechaCreacion: serverTimestamp(), fechaActualizacion: serverTimestamp(),
      });
      const leadId = searchParams.get("leadId");
      if (leadId) await updateDoc(doc(db, "leads", leadId), { estado: "CONVERTIDO", operacionId: opRef.id, fechaActualizacion: serverTimestamp() });
      setMensaje(`Operación ${opRef.id.slice(0, 8).toUpperCase()} creada correctamente.`);
      setPaso(3);
    } catch (e) { console.error(e); setErrorValidacion("Error al guardar la operación."); }
    finally { setLoading(false); }
  };

  const generarLink = () => {
    const token = Math.random().toString(36).substring(2, 15);
    setLinkGenerado(`${window.location.origin}/onboarding/${token}`);
  };
  const copiarLink = () => { navigator.clipboard.writeText(linkGenerado); setCopiado(true); setTimeout(() => setCopiado(false), 2000); };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const ic = "bg-[#111] border border-gray-700 p-3 rounded-lg text-white focus:outline-none w-full";

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8F9FA] p-6 lg:p-12 font-sans">
      <div className="max-w-4xl mx-auto">

        <div className="mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Nueva Operación</h1>
          <p className="text-gray-400">Legajo digital y validación de identidad</p>
        </div>

        {vieneDeLead && (
          <div className="flex items-center gap-3 p-3 mb-6 rounded-xl text-sm font-bold"
            style={{ background: "#0a1f0a", border: "1px solid #16a34a44", color: "#4ade80" }}>
            ✅ Datos pre-cargados desde el simulador. Completá los campos faltantes.
          </div>
        )}

        {paso === 1 && (
          <div className="space-y-6">
            {/* Datos personales */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}><User size={20}/> Datos Personales</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div><label className="text-xs text-gray-500 uppercase block mb-1">DNI</label><input type="number" value={cliente.dni} onChange={e => setCliente({...cliente, dni: e.target.value})} className={ic}/></div>
                <div><label className="text-xs text-gray-500 uppercase block mb-1">Género</label>
                  <select value={cliente.genero} onChange={e => setCliente({...cliente, genero: e.target.value})} className={ic}>
                    <option value="M">Masculino</option><option value="F">Femenino</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="text-xs text-gray-500 uppercase block mb-1">Estado Civil</label>
                  <select value={cliente.estadoCivil} onChange={e => setCliente({...cliente, estadoCivil: e.target.value})} className={ic}>
                    <option value="SOLTERO">Soltero/a</option><option value="CASADO">Casado/a</option>
                    <option value="DIVORCIADO">Divorciado/a</option><option value="VIUDO">Viudo/a</option>
                    <option value="UNION_CONVIVENCIAL">Unión Convivencial</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Primer Nombre" value={cliente.primerNombre} onChange={e => setCliente({...cliente, primerNombre: e.target.value})} className={ic}/>
                <input placeholder="Segundo Nombre" value={cliente.segundoNombre} onChange={e => setCliente({...cliente, segundoNombre: e.target.value})} className={ic}/>
                <input placeholder="Apellido Paterno" value={cliente.apellidoPaterno} onChange={e => setCliente({...cliente, apellidoPaterno: e.target.value})} className={ic}/>
                <input placeholder="Apellido Materno" value={cliente.apellidoMaterno} onChange={e => setCliente({...cliente, apellidoMaterno: e.target.value})} className={ic}/>
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}><Phone size={20}/> Contacto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Teléfono" value={cliente.telefono} onChange={e => setCliente({...cliente, telefono: e.target.value})} className={ic}/>
                <input placeholder="Email" value={cliente.email} onChange={e => setCliente({...cliente, email: e.target.value})} className={ic}/>
              </div>
            </div>

            {/* Domicilio */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}><MapPin size={20}/> Domicilio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Calle y número" value={cliente.domicilio} onChange={e => setCliente({...cliente, domicilio: e.target.value})} className={ic}/>
                <input placeholder="Localidad" value={cliente.localidad} onChange={e => setCliente({...cliente, localidad: e.target.value})} className={ic}/>
                <input placeholder="Provincia" value={cliente.provincia} onChange={e => setCliente({...cliente, provincia: e.target.value})} className={ic}/>
                <input placeholder="Código Postal" value={cliente.codigoPostal} onChange={e => setCliente({...cliente, codigoPostal: e.target.value})} className={ic}/>
              </div>
            </div>

            {/* Laboral */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}><Building2 size={20}/> Datos Laborales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Lugar de Trabajo" value={cliente.lugarTrabajo} onChange={e => setCliente({...cliente, lugarTrabajo: e.target.value})} className={ic}/>
                <input placeholder="Teléfono Laboral" value={cliente.telefonoLaboral} onChange={e => setCliente({...cliente, telefonoLaboral: e.target.value})} className={ic}/>
              </div>
            </div>

            {/* Bancario */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}><Building2 size={20}/> Información Bancaria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input placeholder="Nombre del Banco" value={cliente.banco} onChange={e => setCliente({...cliente, banco: e.target.value})} className={ic}/>
                <input placeholder="CBU (22 dígitos)" maxLength={22} value={cliente.cbu} onChange={e => setCliente({...cliente, cbu: e.target.value})} className={ic + " font-mono"}/>
              </div>
              <input placeholder="Alias CBU" value={cliente.alias} onChange={e => setCliente({...cliente, alias: e.target.value})} className={ic}/>
            </div>

            {errorValidacion && <div className="p-4 bg-red-950/30 border border-red-900/50 text-red-500 rounded-lg flex items-center gap-3"><AlertTriangle size={20}/>{errorValidacion}</div>}

            <button onClick={consultarBcra} disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 hover:opacity-90 transition-all text-white"
              style={{ backgroundColor: colorPrimario }}>
              {loading ? <Loader2 className="animate-spin"/> : <Search/>} Validar Identidad y BCRA
            </button>

            {bcraInfo && (
              <div className="p-6 bg-green-950/20 border border-green-900/50 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-green-500">BCRA: {bcraInfo.denominacionBCRA}</p>
                  <p className="text-sm text-gray-400">Situación {bcraInfo.situacionCrediticia} · {bcraInfo.situacionCrediticia <= 2 ? "Sin deudas graves detectadas." : "Revisar situación crediticia."}</p>
                </div>
                <button onClick={() => setPaso(2)} className="px-8 py-3 rounded-lg font-bold text-white" style={{ background: colorPrimario }}>Continuar →</button>
              </div>
            )}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}><CreditCard size={20}/> Estructura del Crédito</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-gray-500 uppercase block mb-1">Tipo</label>
                  <select value={tipoCredito} onChange={e => setTipoCredito(e.target.value)} className={ic}>
                    <option value="ADELANTO">Adelanto de Sueldo</option>
                    <option value="CUAD">CUAD</option>
                    <option value="PRIVADO">Crédito Privado</option>
                  </select>
                </div>
                <div><label className="text-xs text-gray-500 uppercase block mb-1">Monto ($)</label><input type="number" value={monto} onChange={e => setMonto(e.target.value)} className={ic}/></div>
                <div><label className="text-xs text-gray-500 uppercase block mb-1">Cuotas</label>
                  <select value={cuotas} onChange={e => setCuotas(e.target.value)} className={ic}>
                    {[3,6,9,12,18,24,36].map(c => <option key={c} value={c}>{c} cuotas</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: colorPrimario }}><PenTool size={20}/> Firma Digital</h2>
              <p className="text-gray-400 text-sm mb-4">El cliente debe firmar en el recuadro para dar conformidad.</p>
              <div className="bg-gray-900/50 rounded-xl overflow-hidden border border-dashed border-gray-700 mb-4">
                <canvas ref={canvasRef} width={600} height={200} className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseOut={stopDrawing} onMouseMove={draw}
                  onTouchStart={startDrawing} onTouchEnd={stopDrawing} onTouchMove={draw}/>
              </div>
              <div className="flex gap-3">
                <button onClick={limpiarFirma} className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white text-sm"><Eraser size={14}/> Limpiar</button>
                <div className="flex-1"/>
                <button onClick={generarLink} className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:text-white text-sm"><LinkIcon size={14}/> Link para cliente</button>
              </div>
              {linkGenerado && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-gray-900 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 font-mono flex-1 truncate">{linkGenerado}</p>
                  <button onClick={copiarLink} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: copiado ? "#16a34a22" : colorPrimario + "22", color: copiado ? "#4ade80" : colorPrimario }}>
                    <Copy size={11}/> {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
            </div>

            {errorValidacion && <div className="p-4 bg-red-950/30 border border-red-900/50 text-red-500 rounded-lg flex items-center gap-3"><AlertTriangle size={20}/>{errorValidacion}</div>}

            <div className="flex gap-4">
              <button onClick={() => setPaso(1)} className="px-8 py-4 rounded-xl border border-gray-700 text-gray-400 hover:text-white font-bold">← Volver</button>
              <button onClick={guardarOperacion} disabled={loading}
                className="flex-1 py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 hover:opacity-90 transition-all text-white"
                style={{ backgroundColor: colorPrimario }}>
                {loading ? <Loader2 className="animate-spin"/> : <Save/>} Guardar Operación
              </button>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-12 text-center">
            <CheckCircle2 size={56} className="mx-auto mb-6" style={{ color: colorPrimario }}/>
            <h2 className="text-2xl font-bold text-white mb-2">Operación creada</h2>
            <p className="text-gray-400 mb-2">{mensaje}</p>
            <p className="text-gray-500 text-sm mb-8">La operación fue enviada a revisión.</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => router.push("/dashboard/operaciones")} className="px-8 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white font-bold">Ver operaciones</button>
              <button onClick={() => { setPaso(1); setBcraInfo(null); setMensaje(""); setVieneDeLead(false); setCliente({ dni:"",genero:"M",primerNombre:"",segundoNombre:"",apellidoPaterno:"",apellidoMaterno:"",cuil:"",email:"",telefono:"",domicilio:"",localidad:"",provincia:"",codigoPostal:"",banco:"",cbu:"",alias:"",lugarTrabajo:"",telefonoLaboral:"",estadoCivil:"SOLTERO" }); }}
                className="px-8 py-3 rounded-xl font-bold text-white hover:opacity-90" style={{ backgroundColor: colorPrimario }}>
                Nueva operación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OriginacionPage() {
  return (
    <Suspense fallback={null}>
      <OriginacionPageInner />
    </Suspense>
  );
}
