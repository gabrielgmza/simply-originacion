"use client";

import { useEffect, useRef, useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  CheckCircle2, Camera, FileText, PenLine,
  CreditCard, ShieldCheck, Loader2, AlertTriangle, ChevronRight
} from "lucide-react";

interface OnboardingData {
  docId: string; token: string; legajoId: string; dni: string;
  nombreCliente: string; entidadId: string; estado: string;
  pasos: Record<string, boolean>; archivos: Record<string, string | null>;
  cbu: string; expiracion: string;
}

type Paso = "bienvenida" | "dni_frente" | "dni_dorso" | "selfie" | "firma" | "cbu" | "terminos" | "completado";

export default function OnboardingPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paso, setPaso] = useState<Paso>("bienvenida");
  const [guardando, setGuardando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dibujando, setDibujando] = useState(false);
  const [firmaHecha, setFirmaHecha] = useState(false);
  const [cbuInput, setCbuInput] = useState("");
  const [cbuConfirm, setCbuConfirm] = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const q = query(collection(db, "onboarding_tokens"), where("token", "==", token));
        const snap = await getDocs(q);
        if (snap.empty) { setError("El link no es válido o ya fue utilizado."); setLoading(false); return; }
        const docSnap = snap.docs[0];
        const d = { docId: docSnap.id, ...docSnap.data() } as OnboardingData;
        if (new Date(d.expiracion) < new Date()) { setError("Este link expiró. Solicitá uno nuevo a tu asesor."); setLoading(false); return; }
        if (d.estado === "COMPLETADO") { setPaso("completado"); setData(d); setLoading(false); return; }
        setData(d);
        if (d.pasos.dniFrente && !d.pasos.dniDorso) setPaso("dni_dorso");
        else if (d.pasos.dniDorso && !d.pasos.selfie) setPaso("selfie");
        else if (d.pasos.selfie && !d.pasos.firma) setPaso("firma");
        else if (d.pasos.firma && !d.pasos.cbu) setPaso("cbu");
        else if (d.pasos.cbu && !d.pasos.terminos) setPaso("terminos");
        else setPaso("bienvenida");
      } catch { setError("Error al cargar. Intentá de nuevo."); }
      finally { setLoading(false); }
    };
    cargar();
  }, [token]);

  const subirFoto = async (tipo: "dniFrente" | "dniDorso" | "selfie", archivo: File) => {
    if (!data) return;
    setGuardando(true);
    try {
      const storageRef = ref(storage, `onboarding/${data.legajoId}/${tipo}_${Date.now()}`);
      await uploadBytes(storageRef, archivo);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "onboarding_tokens", data.docId), {
        [`archivos.${tipo}`]: url, [`pasos.${tipo}`]: true, estado: "EN_PROGRESO",
      });
      const sig: Record<string, Paso> = { dniFrente: "dni_dorso", dniDorso: "selfie", selfie: "firma" };
      setPaso(sig[tipo]);
    } catch { alert("Error al subir la foto. Intentá de nuevo."); }
    finally { setGuardando(false); }
  };

  const guardarFirma = async () => {
    if (!canvasRef.current || !data) return;
    setGuardando(true);
    try {
      const blob = await new Promise<Blob>((res) => canvasRef.current!.toBlob((b) => res(b!), "image/png"));
      const storageRef = ref(storage, `onboarding/${data.legajoId}/firma_${Date.now()}.png`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "onboarding_tokens", data.docId), { "archivos.firma": url, "pasos.firma": true });
      setPaso("cbu");
    } catch { alert("Error al guardar firma."); }
    finally { setGuardando(false); }
  };

  const guardarCbu = async () => {
    if (cbuInput !== cbuConfirm) { alert("Los CBU no coinciden."); return; }
    if (cbuInput.length !== 22) { alert("El CBU debe tener 22 dígitos."); return; }
    if (!data) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "onboarding_tokens", data.docId), { cbu: cbuInput, "pasos.cbu": true });
      setPaso("terminos");
    } catch { alert("Error al guardar CBU."); }
    finally { setGuardando(false); }
  };

  const completar = async () => {
    if (!aceptaTerminos || !data) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "onboarding_tokens", data.docId), {
        "pasos.terminos": true, estado: "COMPLETADO", completadoEn: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, "operaciones", data.legajoId), {
          "onboarding.completado": true, "onboarding.cbu": cbuInput, "onboarding.fechaCompletado": serverTimestamp(),
        });
      } catch { }
      setPaso("completado");
    } catch { alert("Error al finalizar."); }
    finally { setGuardando(false); }
  };

  const iniciarTrazo = (e: React.TouchEvent | React.MouseEvent) => {
    setDibujando(true); setFirmaHecha(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  };

  const dibujar = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dibujando) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#ffffff";
    ctx.lineTo(x, y); ctx.stroke();
  };

  const limpiarFirma = () => {
    canvasRef.current!.getContext("2d")!.clearRect(0, 0, 340, 200);
    setFirmaHecha(false);
  };

  const pasosList = ["dniFrente", "dniDorso", "selfie", "firma", "cbu", "terminos"];
  const completados = data ? pasosList.filter(p => data.pasos[p]).length : 0;
  const porcentaje = Math.round((completados / pasosList.length) * 100);

  if (loading) return <Pantalla><Loader2 className="animate-spin text-[#FF5E14]" size={40} /></Pantalla>;
  if (error) return <Pantalla><AlertTriangle size={48} className="text-yellow-500 mb-4" /><p className="text-white font-bold text-lg mb-2">Link no válido</p><p className="text-gray-400 text-sm text-center">{error}</p></Pantalla>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col max-w-md mx-auto">
      {paso !== "completado" && (
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-[#FF5E14] text-white font-black px-2 py-1 rounded text-sm">S</div>
            <span className="font-black italic">Simply</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF5E14] rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{porcentaje}% completado</p>
        </div>
      )}

      <div className="flex-1 p-6">
        {paso === "bienvenida" && (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="bg-[#FF5E14]/10 p-6 rounded-full mb-6"><ShieldCheck size={48} className="text-[#FF5E14]" /></div>
            <h1 className="text-2xl font-black mb-3">Hola{data?.nombreCliente ? `, ${data.nombreCliente.split(" ")[0]}` : ""}!</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">Tu asesor inició el proceso. Solo te llevará <strong className="text-white">5 minutos</strong>.</p>
            <div className="w-full space-y-3 mb-8">
              {[
                { icon: <FileText size={18} />, label: "Foto de tu DNI (frente y dorso)" },
                { icon: <Camera size={18} />, label: "Una selfie tuya" },
                { icon: <PenLine size={18} />, label: "Tu firma digital" },
                { icon: <CreditCard size={18} />, label: "Tu número de CBU" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-900/50 p-4 rounded-xl text-sm text-gray-300">
                  <span className="text-[#FF5E14]">{item.icon}</span>{item.label}
                </div>
              ))}
            </div>
            <button onClick={() => setPaso("dni_frente")} className="w-full bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors">
              Comenzar <ChevronRight size={20} />
            </button>
          </div>
        )}

        {paso === "dni_frente" && <FotoPaso titulo="Frente del DNI" descripcion="Tomá una foto clara del frente de tu DNI." icono={<FileText size={32} className="text-[#FF5E14]" />} onFoto={(f) => subirFoto("dniFrente", f)} guardando={guardando} precargado={data?.archivos.dniFrente} />}
        {paso === "dni_dorso" && <FotoPaso titulo="Dorso del DNI" descripcion="Ahora tomá una foto del dorso de tu DNI." icono={<FileText size={32} className="text-[#FF5E14]" />} onFoto={(f) => subirFoto("dniDorso", f)} guardando={guardando} precargado={data?.archivos.dniDorso} />}
        {paso === "selfie" && <FotoPaso titulo="Tu selfie" descripcion="Tomá una foto de tu cara. Mirá a la cámara, con buena luz." icono={<Camera size={32} className="text-[#FF5E14]" />} onFoto={(f) => subirFoto("selfie", f)} guardando={guardando} selfie precargado={data?.archivos.selfie} />}

        {paso === "firma" && (
          <div>
            <h2 className="text-xl font-black mb-2">Tu firma</h2>
            <p className="text-gray-400 text-sm mb-6">Firmá con tu dedo dentro del recuadro.</p>
            <div className="bg-gray-900 rounded-2xl p-2 mb-4 border border-gray-700">
              <canvas ref={canvasRef} width={340} height={200} className="w-full touch-none rounded-xl" style={{ background: "#111" }}
                onMouseDown={iniciarTrazo} onMouseMove={dibujar} onMouseUp={() => setDibujando(false)}
                onTouchStart={iniciarTrazo} onTouchMove={dibujar} onTouchEnd={() => setDibujando(false)} />
            </div>
            <div className="flex gap-3">
              <button onClick={limpiarFirma} className="flex-1 bg-gray-800 text-white py-3 rounded-xl text-sm">Limpiar</button>
              <button onClick={guardarFirma} disabled={!firmaHecha || guardando}
                className="flex-1 bg-[#FF5E14] disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                {guardando ? <Loader2 size={16} className="animate-spin" /> : "Confirmar firma"}
              </button>
            </div>
          </div>
        )}

        {paso === "cbu" && (
          <div>
            <h2 className="text-xl font-black mb-2">Tu CBU</h2>
            <p className="text-gray-400 text-sm mb-6">CBU donde recibís el crédito. Debe ser tuyo.</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase">CBU (22 dígitos)</label>
                <input type="number" value={cbuInput} onChange={e => setCbuInput(e.target.value)} placeholder="0000000000000000000000"
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase">Confirmar CBU</label>
                <input type="number" value={cbuConfirm} onChange={e => setCbuConfirm(e.target.value)} placeholder="Repetí tu CBU"
                  className={`w-full bg-[#111] border rounded-xl px-4 py-3 text-sm focus:outline-none ${cbuConfirm && cbuInput !== cbuConfirm ? "border-red-600" : "border-gray-700"}`} />
                {cbuConfirm && cbuInput !== cbuConfirm && <p className="text-red-400 text-xs mt-1">Los CBU no coinciden</p>}
              </div>
            </div>
            <button onClick={guardarCbu} disabled={guardando || cbuInput.length !== 22 || cbuInput !== cbuConfirm}
              className="w-full bg-[#FF5E14] disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : "Confirmar CBU"}
            </button>
          </div>
        )}

        {paso === "terminos" && (
          <div>
            <h2 className="text-xl font-black mb-2">Términos y Condiciones</h2>
            <p className="text-gray-400 text-sm mb-4">Leé y aceptá antes de finalizar.</p>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 h-48 overflow-y-auto text-xs text-gray-400 leading-relaxed mb-6">
              <p className="font-bold text-white mb-2">Contrato de Crédito Personal</p>
              <p>El solicitante declara que la información proporcionada es verídica. Autoriza a la entidad a consultar su historial crediticio en el BCRA. La firma digital tiene validez legal según la Ley 25.506 de Firma Digital de Argentina. El crédito será acreditado en el CBU declarado. El incumplimiento generará intereses punitorios conforme a las condiciones pactadas. Al confirmar, acepta todas las condiciones del presente contrato.</p>
            </div>
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input type="checkbox" checked={aceptaTerminos} onChange={e => setAceptaTerminos(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#FF5E14]" />
              <span className="text-sm text-gray-300">Leí y acepto los términos y condiciones.</span>
            </label>
            <button onClick={completar} disabled={!aceptaTerminos || guardando}
              className="w-full bg-[#FF5E14] disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : "Finalizar y firmar"}
            </button>
          </div>
        )}

        {paso === "completado" && (
          <div className="flex flex-col items-center text-center pt-12">
            <div className="bg-green-500/10 p-6 rounded-full mb-6"><CheckCircle2 size={56} className="text-green-400" /></div>
            <h1 className="text-2xl font-black mb-3">¡Todo listo!</h1>
            <p className="text-gray-400 leading-relaxed">Tu documentación fue enviada. Tu asesor te contactará pronto.</p>
            <div className="mt-8 bg-gray-900 rounded-2xl p-5 w-full text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Resumen</p>
              <div className="space-y-2 text-sm">
                {["DNI frente", "DNI dorso", "Selfie", "Firma digital", "CBU", "Términos"].map(item => (
                  <div key={item} className="flex justify-between"><span className="text-gray-400">{item}</span><span className="text-green-400">✓</span></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FotoPaso({ titulo, descripcion, icono, onFoto, guardando, selfie = false, precargado }: {
  titulo: string; descripcion: string; icono: React.ReactNode;
  onFoto: (f: File) => void; guardando: boolean; selfie?: boolean; precargado?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(precargado || null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onFoto(file);
  };
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">{icono}<h2 className="text-xl font-black">{titulo}</h2></div>
      <p className="text-gray-400 text-sm mb-6">{descripcion}</p>
      <input ref={inputRef} type="file" accept="image/*" capture={selfie ? "user" : "environment"} onChange={handleChange} className="hidden" />
      {preview ? (
        <div className="mb-4"><img src={preview} alt="preview" className="w-full rounded-2xl object-cover max-h-64" /></div>
      ) : (
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-gray-700 rounded-2xl p-12 flex flex-col items-center gap-3 mb-4 cursor-pointer hover:border-gray-500 transition-colors">
          <Camera size={32} className="text-gray-600" />
          <p className="text-sm text-gray-500">Tocá para sacar la foto</p>
        </div>
      )}
      {preview && guardando && (
        <div className="bg-[#FF5E14]/20 text-[#FF5E14] py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Subiendo...
        </div>
      )}
    </div>
  );
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6">{children}</div>;
}
