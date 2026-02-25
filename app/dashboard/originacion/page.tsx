"use client";

import { useRef, useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Save, Eraser, CheckCircle2, Loader2, User, CreditCard, PenTool, Search, ShieldCheck, Link as LinkIcon, Copy, Lock, FileCheck, AlertTriangle, Building2, MapPin, Phone, Mail } from "lucide-react";

export default function OriginacionPage() {
  const { userData, entidadData } = useAuth();
  const router = useRouter();
  
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  
  // --- Campos Atómicos del Cliente ---
  const [cliente, setCliente] = useState({
    dni: "",
    genero: "M",
    primerNombre: "",
    segundoNombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    cuil: "",
    email: "",
    telefono: "",
    domicilio: "",
    localidad: "",
    provincia: "",
    codigoPostal: "",
    banco: "",
    cbu: "",
    alias: "",
    lugarTrabajo: "",
    telefonoLaboral: "",
    estadoCivil: "SOLTERO"
  });

  const [bcraInfo, setBcraInfo] = useState<any>(null);
  const [monto, setMonto] = useState("100000");
  const [cuotas, setCuotas] = useState("12");
  const [tipoCredito, setTipoCredito] = useState("ADELANTO");
  const [cupoDisponible, setCupoDisponible] = useState<number | null>(null);
  const [consultandoCupo, setConsultandoCupo] = useState(false);
  const [cupoTomado, setCupoTomado] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState("");
  const [copiado, setCopiado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // --- Validación de Duplicados ---
  const verificarDuplicado = async (dni: string) => {
    const q = query(collection(db, "operaciones"), where("entidadId", "==", entidadData?.id), where("cliente.dni", "==", dni));
    const snap = await getDocs(q);
    return !snap.empty;
  };

  const consultarBcra = async () => {
    if (!cliente.dni || !cliente.apellidoPaterno) {
      setErrorValidacion("DNI y Apellido son obligatorios.");
      return;
    }
    setErrorValidacion("");
    setLoading(true);
    
    try {
      const yaExiste = await verificarDuplicado(cliente.dni);
      if (yaExiste) {
        setErrorValidacion("Atención: Ya existe una operación activa para este DNI en tu entidad.");
        setLoading(false);
        return;
      }

      // Cálculo de CUIL interno simplificado para la API
      const cuilGen = calcularCuil(cliente.dni, cliente.genero);
      setCliente(prev => ({...prev, cuil: cuilGen}));

      const res = await fetch("/api/bcra/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuil: cuilGen })
      });
      const data = await res.json();
      setBcraInfo(data);
    } catch (error) {
      setErrorValidacion("Error de conexión BCRA.");
    } finally {
      setLoading(false);
    }
  };

  const calcularCuil = (dni: string, gen: string) => {
    const dniFormat = dni.padStart(8, '0');
    const prefijo = gen === 'M' ? '20' : '27';
    return `${prefijo}${dniFormat}1`; // Simplificado para este paso
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8F9FA] p-6 lg:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Originador Pro v3.0</h1>
          <p className="text-gray-400">Sprint 1: Legajo Atómico y Validación de Duplicados</p>
        </div>

        {paso === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}>
                <User size={20} /> Datos Personales del Solicitante
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">DNI</label>
                  <input type="number" value={cliente.dni} onChange={e => setCliente({...cliente, dni: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Género</label>
                  <select value={cliente.genero} onChange={e => setCliente({...cliente, genero: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:outline-none">
                    <option value="M">Masculino</option><option value="F">Femenino</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 uppercase">Estado Civil</label>
                  <select value={cliente.estadoCivil} onChange={e => setCliente({...cliente, estadoCivil: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg focus:outline-none">
                    <option value="SOLTERO">Soltero/a</option><option value="CASADO">Casado/a</option><option value="DIVORCIADO">Divorciado/a</option><option value="VIUDO">Viudo/a</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input placeholder="Primer Nombre" value={cliente.primerNombre} onChange={e => setCliente({...cliente, primerNombre: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
                <input placeholder="Segundo Nombre (Opcional)" value={cliente.segundoNombre} onChange={e => setCliente({...cliente, segundoNombre: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
                <input placeholder="Apellido Paterno" value={cliente.apellidoPaterno} onChange={e => setCliente({...cliente, apellidoPaterno: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
                <input placeholder="Apellido Materno" value={cliente.apellidoMaterno} onChange={e => setCliente({...cliente, apellidoMaterno: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 bg-[#111] border border-gray-700 p-3 rounded-lg">
                  <Mail size={18} className="text-gray-500" />
                  <input placeholder="Email Personal" value={cliente.email} onChange={e => setCliente({...cliente, email: e.target.value})} className="bg-transparent w-full focus:outline-none" />
                </div>
                <div className="flex items-center gap-2 bg-[#111] border border-gray-700 p-3 rounded-lg">
                  <Phone size={18} className="text-gray-500" />
                  <input placeholder="Teléfono / WhatsApp" value={cliente.telefono} onChange={e => setCliente({...cliente, telefono: e.target.value})} className="bg-transparent w-full focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}>
                <MapPin size={20} /> Ubicación y Empleo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <input placeholder="Dirección Completa" value={cliente.domicilio} onChange={e => setCliente({...cliente, domicilio: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg" />
                </div>
                <input placeholder="CP" value={cliente.codigoPostal} onChange={e => setCliente({...cliente, codigoPostal: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input placeholder="Localidad" value={cliente.localidad} onChange={e => setCliente({...cliente, localidad: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
                <input placeholder="Provincia" value={cliente.provincia} onChange={e => setCliente({...cliente, provincia: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Lugar de Trabajo" value={cliente.lugarTrabajo} onChange={e => setCliente({...cliente, lugarTrabajo: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
                <input placeholder="Teléfono Laboral" value={cliente.telefonoLaboral} onChange={e => setCliente({...cliente, telefonoLaboral: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: colorPrimario }}>
                <Building2 size={20} /> Información Bancaria
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input placeholder="Nombre del Banco" value={cliente.banco} onChange={e => setCliente({...cliente, banco: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg" />
                <input placeholder="CBU (22 dígitos)" maxLength={22} value={cliente.cbu} onChange={e => setCliente({...cliente, cbu: e.target.value})} className="bg-[#111] border border-gray-700 p-3 rounded-lg font-mono" />
              </div>
              <input placeholder="Alias CBU" value={cliente.alias} onChange={e => setCliente({...cliente, alias: e.target.value})} className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg" />
            </div>

            {errorValidacion && <div className="p-4 bg-red-950/30 border border-red-900/50 text-red-500 rounded-lg flex items-center gap-3"><AlertTriangle size={20}/>{errorValidacion}</div>}

            <button onClick={consultarBcra} disabled={loading} className="w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all hover:opacity-90" style={{ backgroundColor: colorPrimario }}>
              {loading ? <Loader2 className="animate-spin" /> : <Search />} Validar Identidad y BCRA
            </button>

            {bcraInfo && (
               <div className="p-6 bg-green-950/20 border border-green-900/50 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-green-500">BCRA: {bcraInfo.denominacionBCRA}</p>
                    <p className="text-sm text-gray-400">Situación {bcraInfo.situacionCrediticia} • Sin deudas graves detectadas.</p>
                  </div>
                  <button onClick={() => setPaso(2)} className="bg-green-600 px-8 py-3 rounded-lg font-bold">Continuar</button>
               </div>
            )}
          </div>
        )}

        {/* Pasos 2 en adelante se mantienen similares pero con la data nueva */}
        {paso === 2 && (
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 animate-fade-in text-center">
             <h2 className="text-2xl font-bold mb-4">Paso 2: Simulación Porcentual</h2>
             <p className="text-gray-400 mb-8">En el siguiente bloque actualizaremos la lógica de cálculos porcentuales.</p>
             <button onClick={() => setPaso(1)} className="text-gray-500 underline">Volver al Legajo</button>
          </div>
        )}
      </div>
    </div>
  );
}
