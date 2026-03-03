"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useParams } from "next/navigation";
import {
  Loader2, ShieldCheck, CheckCircle2, AlertTriangle,
  Camera, CreditCard, PenTool, Eraser, MapPin,
  Eye, ChevronRight, RefreshCw, FileText, User
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Paso = "bienvenida" | "dni_frente" | "dni_dorso" | "selfie" | "firma" | "campos_extra" | "confirmacion" | "completado";

interface CampoExtra {
  id: string;
  label: string;
  tipo: "texto" | "numero" | "fecha" | "foto" | "archivo";
  requerido: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function dataURLtoBlob(dataURL: string) {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

// ── Liveness: detecta movimiento entre 2 frames del canvas ────────────────────
function calcularDiferenciaFrames(frame1: ImageData, frame2: ImageData): number {
  let diff = 0;
  for (let i = 0; i < frame1.data.length; i += 4) {
    diff += Math.abs(frame1.data[i] - frame2.data[i]);
  }
  return diff / (frame1.data.length / 4);
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function OnboardingMejorado() {
  const params = useParams();
  const token = params?.token as string;

  // ── Estado base ──
  const [paso, setPaso]         = useState<Paso>("bienvenida");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorStatus, setErrorStatus] = useState("");
  const [entidad, setEntidad]   = useState<any>(null);
  const [operacion, setOperacion] = useState<any>(null);
  const [linkData, setLinkData] = useState<any>(null);

  // ── Capturas ──
  const [dniFrenteB64, setDniFrenteB64] = useState("");
  const [dniDorsoB64,  setDniDorsoB64]  = useState("");
  const [selfieB64,    setSelfieB64]    = useState("");
  const [firmaB64,     setFirmaB64]     = useState("");
  const [geolocacion,  setGeolocacion]  = useState<{lat: number; lng: number} | null>(null);
  const [camposExtra,  setCamposExtra]  = useState<Record<string, any>>({});

  // ── Liveness ──
  const [livenessOk,    setLivenessOk]    = useState(false);
  const [livenessMsg,   setLivenessMsg]   = useState("Mirá la cámara y mové la cabeza lentamente");
  const [livenessScore, setLivenessScore] = useState(0);

  // ── Refs cámara ──
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const firmaRef   = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const isDrawing  = useRef(false);

  const colorPrimario = entidad?.configuracion?.colorPrimario || "#FF5E14";
  const camposPersonalizados: CampoExtra[] = linkData?.camposExtra || [];

  // ── Validar magic link ──────────────────────────────────────────────────────
  useEffect(() => {
    const validar = async () => {
      if (!token) return;
      try {
        const linkSnap = await getDoc(doc(db, "magic_links", token));
        if (!linkSnap.exists()) { setErrorStatus("Link inválido o no encontrado."); return; }
        const ld = linkSnap.data();
        if (ld.usado) { setErrorStatus("Este enlace ya fue utilizado."); return; }
        const exp = ld.expiracion?.toDate?.() || new Date(ld.expiracion?.seconds * 1000);
        if (new Date() > exp) { setErrorStatus("Este enlace ha caducado."); return; }
        setLinkData(ld);

        const [entSnap, opSnap] = await Promise.all([
          getDoc(doc(db, "entidades", ld.entidadId)),
          getDoc(doc(db, "operaciones", ld.operacionId)),
        ]);
        if (entSnap.exists()) setEntidad({ id: entSnap.id, ...entSnap.data() });
        if (opSnap.exists()) setOperacion({ id: opSnap.id, ...opSnap.data() });

        // Geolocalización al entrar
        navigator.geolocation?.getCurrentPosition(
          pos => setGeolocacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {}
        );
      } catch (e) {
        setErrorStatus("Error de conexión segura.");
      } finally {
        setCargando(false);
      }
    };
    validar();
  }, [token]);

  // ── Iniciar cámara ──────────────────────────────────────────────────────────
  const iniciarCamara = useCallback(async (facingMode: "user" | "environment" = "environment") => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error("Cámara:", e);
    }
  }, []);

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ── Efectos por paso ────────────────────────────────────────────────────────
  useEffect(() => {
    if (paso === "dni_frente" || paso === "dni_dorso") iniciarCamara("environment");
    else if (paso === "selfie") { iniciarCamara("user"); iniciarLiveness(); }
    else detenerCamara();
    return () => { if (paso !== "selfie" && paso !== "dni_frente" && paso !== "dni_dorso") detenerCamara(); };
  }, [paso]);

  // ── Liveness check por movimiento ──────────────────────────────────────────
  const iniciarLiveness = useCallback(() => {
    setLivenessOk(false);
    setLivenessScore(0);
    setLivenessMsg("Mirá la cámara y mové la cabeza lentamente de izquierda a derecha");
    let frames: ImageData[] = [];
    let totalMovimiento = 0;
    const THRESHOLD = 8; // score mínimo para aprobar

    const capturarFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width  = videoRef.current.videoWidth  || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      frames.push(frame);
      if (frames.length > 1) {
        const diff = calcularDiferenciaFrames(frames[frames.length - 2], frames[frames.length - 1]);
        if (diff > 2) totalMovimiento += Math.min(diff / 5, 2); // cap por frame
        const score = Math.min(Math.round(totalMovimiento), THRESHOLD);
        setLivenessScore(score);
        if (totalMovimiento >= THRESHOLD) {
          setLivenessOk(true);
          setLivenessMsg("✓ Detección de vida confirmada");
          return;
        }
        if (totalMovimiento > THRESHOLD / 2) setLivenessMsg("Bien, seguí moviendo la cabeza...");
      }
      if (frames.length > 30) frames = frames.slice(-5); // limpiar memoria
      setTimeout(capturarFrame, 200);
    };
    setTimeout(capturarFrame, 1000);
  }, []);

  // ── Capturar foto desde video ───────────────────────────────────────────────
  const capturarFoto = useCallback((): string => {
    if (!videoRef.current) return "";
    const canvas = document.createElement("canvas");
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  // ── Subir imagen a Firebase Storage ────────────────────────────────────────
  const subirImagen = async (base64: string, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, base64, "data_url");
    return getDownloadURL(storageRef);
  };

  // ── Firma canvas ────────────────────────────────────────────────────────────
  const getFirmaCtx = () => firmaRef.current?.getContext("2d");

  const onFirmaStart = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawing.current = true;
    const ctx = getFirmaCtx();
    if (!ctx || !firmaRef.current) return;
    const rect = firmaRef.current.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top  : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const onFirmaMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current || !firmaRef.current) return;
    const ctx = getFirmaCtx();
    if (!ctx) return;
    e.preventDefault();
    const rect = firmaRef.current.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top  : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.strokeStyle = colorPrimario;
    ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const onFirmaEnd = () => {
    isDrawing.current = false;
    if (firmaRef.current) setFirmaB64(firmaRef.current.toDataURL("image/png"));
  };
  const limpiarFirma = () => {
    const ctx = getFirmaCtx();
    if (ctx && firmaRef.current) ctx.clearRect(0, 0, firmaRef.current.width, firmaRef.current.height);
    setFirmaB64("");
  };

  // ── Finalizar onboarding ────────────────────────────────────────────────────
  const finalizar = async () => {
    if (!operacion || !entidad || !linkData) return;
    setProcesando(true);
    try {
      const entId = entidad.id;
      const opId  = operacion.id;
      const dni   = operacion.cliente?.dni || "sin-dni";

      // Subir imágenes en paralelo
      const [urlFrente, urlDorso, urlSelfie, urlFirma] = await Promise.all([
        dniFrenteB64 ? subirImagen(dniFrenteB64, `onboarding/${entId}/${opId}/dni-frente.jpg`) : Promise.resolve(""),
        dniDorsoB64  ? subirImagen(dniDorsoB64,  `onboarding/${entId}/${opId}/dni-dorso.jpg`)  : Promise.resolve(""),
        selfieB64    ? subirImagen(selfieB64,     `onboarding/${entId}/${opId}/selfie.jpg`)     : Promise.resolve(""),
        firmaB64     ? subirImagen(firmaB64,      `onboarding/${entId}/${opId}/firma.png`)      : Promise.resolve(""),
      ]);

      // Subir campos extra tipo foto/archivo
      const urlsCamposExtra: Record<string, string> = {};
      for (const campo of camposPersonalizados) {
        if ((campo.tipo === "foto" || campo.tipo === "archivo") && camposExtra[campo.id]) {
          urlsCamposExtra[campo.id] = await subirImagen(
            camposExtra[campo.id],
            `onboarding/${entId}/${opId}/campo-${campo.id}.jpg`
          );
        }
      }

      // Actualizar operación
      await updateDoc(doc(db, "operaciones", opId), {
        "legajo.dniFrenteUrl": urlFrente,
        "legajo.dniDorsoUrl":  urlDorso,
        "legajo.selfieUrl":    urlSelfie,
        "legajo.firmaUrl":     urlFirma,
        "legajo.camposExtra":  { ...camposExtra, ...urlsCamposExtra },
        estado: "EN_REVISION",
        "seguridad.geolocacion":       geolocacion,
        "seguridad.livenessAprobado":  livenessOk,
        "seguridad.deviceFingerprint": navigator.userAgent,
        "seguridad.fechaOnboarding":   new Date().toISOString(),
        fechaActualizacion: serverTimestamp(),
      });

      // Marcar link como usado
      await updateDoc(doc(db, "magic_links", token), { usado: true, fechaUso: serverTimestamp() });

      // Auditoría
      await addDoc(collection(db, "auditoria"), {
        operacionId: opId,
        entidadId:   entId,
        accion:      "ONBOARDING_COMPLETADO",
        detalles:    `Liveness: ${livenessOk ? "OK" : "NO"} | Geo: ${geolocacion ? `${geolocacion.lat.toFixed(4)},${geolocacion.lng.toFixed(4)}` : "N/A"}`,
        usuarioEmail: "cliente",
        fecha: serverTimestamp(),
      });

      setPaso("completado");
    } catch (e) {
      console.error(e);
      alert("Error al enviar. Por favor reintentá.");
    } finally {
      setProcesando(false);
    }
  };

  // ── Pantallas de estado ─────────────────────────────────────────────────────
  if (cargando) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-400" size={36}/>
    </div>
  );
  if (errorStatus) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border-t-4 border-red-500">
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4"/>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso denegado</h2>
        <p className="text-gray-500 text-sm">{errorStatus}</p>
      </div>
    </div>
  );
  if (paso === "completado") return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `${colorPrimario}10` }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${colorPrimario}20` }}>
          <CheckCircle2 size={40} style={{ color: colorPrimario }}/>
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">¡Listo!</h2>
        <p className="text-gray-500 text-sm">Tu documentación fue enviada con éxito. El asesor revisará tu solicitud y te contactará pronto.</p>
        <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
          <ShieldCheck size={12}/> Proceso seguro — {entidad?.nombreFantasia}
        </p>
      </div>
    </div>
  );

  // ── Barra de progreso ───────────────────────────────────────────────────────
  const PASOS: Paso[] = ["bienvenida","dni_frente","dni_dorso","selfie","firma",
    ...(camposPersonalizados.length > 0 ? ["campos_extra" as Paso] : []),
    "confirmacion"];
  const pasoIdx = PASOS.indexOf(paso);
  const progreso = Math.round(((pasoIdx + 1) / PASOS.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white"
            style={{ backgroundColor: colorPrimario }}>
            {entidad?.nombreFantasia?.[0] || "P"}
          </div>
          <span className="font-bold text-sm text-gray-800">{entidad?.nombreFantasia}</span>
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1"><ShieldCheck size={12}/> Seguro</span>
      </div>

      {/* Barra progreso */}
      <div className="h-1 bg-gray-200">
        <div className="h-full transition-all duration-500" style={{ width: `${progreso}%`, backgroundColor: colorPrimario }}/>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4 pb-8">

        {/* ── PASO 1: Bienvenida ── */}
        {paso === "bienvenida" && (
          <div className="flex-1 flex flex-col justify-center gap-6 animate-in fade-in duration-300">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${colorPrimario}15` }}>
                <FileText size={36} style={{ color: colorPrimario }}/>
              </div>
              <h1 className="text-2xl font-black text-gray-800 mb-2">Hola, {operacion?.cliente?.nombre?.split(" ")[0]}</h1>
              <p className="text-gray-500 text-sm">Necesitamos verificar tu identidad para procesar tu solicitud de crédito.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Qué necesitás tener</p>
              {[
                { icon: <CreditCard size={16}/>, text: "DNI (frente y dorso)" },
                { icon: <Camera size={16}/>, text: "Cámara frontal para selfie" },
                { icon: <PenTool size={16}/>, text: "Unos minutos para firmar" },
              ].map((i, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-gray-700">
                  <div style={{ color: colorPrimario }}>{i.icon}</div>{i.text}
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p className="font-bold text-gray-600">Crédito #{operacion?.id?.slice(0,8).toUpperCase()}</p>
              <p>Monto: ${(operacion?.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</p>
              <p>Plan: {operacion?.financiero?.cuotas || "—"} cuotas</p>
            </div>

            <button onClick={() => setPaso("dni_frente")}
              className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2"
              style={{ backgroundColor: colorPrimario }}>
              Comenzar <ChevronRight size={18}/>
            </button>
          </div>
        )}

        {/* ── PASO 2 y 3: Captura DNI ── */}
        {(paso === "dni_frente" || paso === "dni_dorso") && (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="text-center pt-4">
              <CreditCard size={24} className="mx-auto mb-2" style={{ color: colorPrimario }}/>
              <h2 className="text-lg font-black text-gray-800">
                {paso === "dni_frente" ? "Fotografiá el frente de tu DNI" : "Fotografiá el dorso de tu DNI"}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {paso === "dni_frente" ? "La cara con tu foto y número" : "La cara con el código de barras"}
              </p>
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
              {/* Guía de encuadre */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white/50 rounded-xl w-4/5 h-3/5"/>
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <p className="text-white text-xs bg-black/50 rounded-full px-3 py-1 inline-block">
                  Encuadrá el DNI dentro del marco
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPaso(paso === "dni_frente" ? "bienvenida" : "dni_frente")}
                className="py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm">
                Volver
              </button>
              <button
                onClick={() => {
                  const foto = capturarFoto();
                  if (paso === "dni_frente") { setDniFrenteB64(foto); setPaso("dni_dorso"); }
                  else { setDniDorsoB64(foto); setPaso("selfie"); }
                }}
                className="py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: colorPrimario }}>
                <Camera size={15}/> Capturar
              </button>
            </div>

            {/* Preview de lo capturado */}
            {paso === "dni_dorso" && dniFrenteB64 && (
              <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3 border border-green-100">
                <CheckCircle2 size={14} className="text-green-500 shrink-0"/>
                <p className="text-xs text-green-700">Frente capturado ✓</p>
                <img src={dniFrenteB64} className="ml-auto w-14 h-9 object-cover rounded-lg border"/>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 4: Selfie + Liveness ── */}
        {paso === "selfie" && (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="text-center pt-4">
              <User size={24} className="mx-auto mb-2" style={{ color: colorPrimario }}/>
              <h2 className="text-lg font-black text-gray-800">Verificación facial</h2>
              <p className="text-xs text-gray-400 mt-1">{livenessMsg}</p>
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-square max-h-72 mx-auto w-full">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]"/>
              <canvas ref={canvasRef} className="hidden"/>
              {/* Overlay oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 rounded-full w-48 h-64"
                  style={{ borderColor: livenessOk ? "#22c55e" : "rgba(255,255,255,0.6)" }}/>
              </div>
              {livenessOk && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12}/> Persona detectada
                  </span>
                </div>
              )}
            </div>

            {/* Barra liveness */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Detección de movimiento</span>
                <span>{Math.min(Math.round((livenessScore / 8) * 100), 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min((livenessScore / 8) * 100, 100)}%`,
                    backgroundColor: livenessOk ? "#22c55e" : colorPrimario }}/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setLivenessOk(false); iniciarLiveness(); }}
                className="py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center gap-1">
                <RefreshCw size={14}/> Reintentar
              </button>
              <button onClick={() => { setSelfieB64(capturarFoto()); setPaso("firma"); }}
                disabled={!livenessOk}
                className="py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ backgroundColor: colorPrimario }}>
                <Camera size={15}/> {livenessOk ? "Capturar selfie" : "Esperando..."}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 5: Firma ── */}
        {paso === "firma" && (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="text-center pt-4">
              <PenTool size={24} className="mx-auto mb-2" style={{ color: colorPrimario }}/>
              <h2 className="text-lg font-black text-gray-800">Firma digital</h2>
              <p className="text-xs text-gray-400">Dibujá tu firma con el dedo</p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-2">
              <canvas ref={firmaRef} width={340} height={160} className="w-full touch-none cursor-crosshair rounded-xl"
                style={{ background: "#fafafa" }}
                onMouseDown={onFirmaStart} onMouseMove={onFirmaMove} onMouseUp={onFirmaEnd}
                onTouchStart={onFirmaStart} onTouchMove={onFirmaMove} onTouchEnd={onFirmaEnd}/>
              <p className="text-center text-xs text-gray-300 mt-1">Área de firma</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={limpiarFirma}
                className="py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center gap-1">
                <Eraser size={14}/> Limpiar
              </button>
              <button
                onClick={() => setPaso(camposPersonalizados.length > 0 ? "campos_extra" : "confirmacion")}
                disabled={!firmaB64}
                className="py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40"
                style={{ backgroundColor: colorPrimario }}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 6: Campos extra ── */}
        {paso === "campos_extra" && camposPersonalizados.length > 0 && (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="text-center pt-4">
              <FileText size={24} className="mx-auto mb-2" style={{ color: colorPrimario }}/>
              <h2 className="text-lg font-black text-gray-800">Información adicional</h2>
              <p className="text-xs text-gray-400">Completá los siguientes datos requeridos</p>
            </div>

            <div className="space-y-4">
              {camposPersonalizados.map((campo: CampoExtra) => (
                <div key={campo.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {campo.label}{campo.requerido && <span className="text-red-400 ml-1">*</span>}
                  </label>

                  {campo.tipo === "texto" && (
                    <input type="text" value={camposExtra[campo.id] || ""}
                      onChange={e => setCamposExtra(p => ({ ...p, [campo.id]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                      placeholder={`Ingresá ${campo.label.toLowerCase()}`}/>
                  )}
                  {campo.tipo === "numero" && (
                    <input type="number" value={camposExtra[campo.id] || ""}
                      onChange={e => setCamposExtra(p => ({ ...p, [campo.id]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                  )}
                  {campo.tipo === "fecha" && (
                    <input type="date" value={camposExtra[campo.id] || ""}
                      onChange={e => setCamposExtra(p => ({ ...p, [campo.id]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                  )}
                  {(campo.tipo === "foto" || campo.tipo === "archivo") && (
                    <div>
                      <input type="file" accept={campo.tipo === "foto" ? "image/*" : "*/*"}
                        capture={campo.tipo === "foto" ? "environment" : undefined}
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => setCamposExtra(p => ({ ...p, [campo.id]: ev.target?.result as string }));
                          reader.readAsDataURL(file);
                        }}
                        className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-bold file:text-white"
                        style={{ ['--file-bg' as any]: colorPrimario }}/>
                      {camposExtra[campo.id] && campo.tipo === "foto" && (
                        <img src={camposExtra[campo.id]} className="mt-2 w-24 h-16 object-cover rounded-xl border"/>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setPaso("confirmacion")}
              className="w-full py-4 rounded-2xl text-white font-black"
              style={{ backgroundColor: colorPrimario }}>
              Continuar
            </button>
          </div>
        )}

        {/* ── PASO 7: Confirmación ── */}
        {paso === "confirmacion" && (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="text-center pt-4">
              <ShieldCheck size={28} className="mx-auto mb-2" style={{ color: colorPrimario }}/>
              <h2 className="text-lg font-black text-gray-800">Revisá tu documentación</h2>
              <p className="text-xs text-gray-400">Todo listo para enviar</p>
            </div>

            <div className="space-y-2">
              {[
                { label: "DNI frente",  ok: !!dniFrenteB64,  img: dniFrenteB64 },
                { label: "DNI dorso",   ok: !!dniDorsoB64,   img: dniDorsoB64 },
                { label: "Selfie",      ok: !!selfieB64,     img: selfieB64 },
                { label: "Firma",       ok: !!firmaB64,      img: firmaB64 },
                { label: "Liveness",    ok: livenessOk,      img: "" },
                { label: "Ubicación",   ok: !!geolocacion,   img: "" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.ok
                      ? <CheckCircle2 size={16} className="text-green-500"/>
                      : <AlertTriangle size={16} className="text-orange-400"/>}
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${item.ok ? "text-green-500" : "text-orange-400"}`}>
                      {item.ok ? "OK" : "Pendiente"}
                    </span>
                    {item.img && (
                      <img src={item.img} className="w-10 h-7 object-cover rounded-lg border"/>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              Al confirmar, aceptás que la información provista es verídica y que la firma digital tiene plena validez legal.
            </div>

            <button onClick={finalizar} disabled={procesando}
              className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2"
              style={{ backgroundColor: colorPrimario }}>
              {procesando ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}
              {procesando ? "Enviando..." : "Confirmar y enviar"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
