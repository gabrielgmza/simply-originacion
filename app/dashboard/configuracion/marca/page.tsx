"use client";
import { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Save, Loader2, Upload, CheckCircle2, Eye,
  Palette, Type, Image, Monitor, Smartphone
} from "lucide-react";

const COLORES_PRESET = [
  "#FF5E14", "#3b82f6", "#22c55e", "#8b5cf6",
  "#ef4444", "#f59e0b", "#ec4899", "#14b8a6",
  "#6366f1", "#0ea5e9", "#84cc16", "#f97316",
];

export default function MarcaPage() {
  const { entidadData } = useAuth();

  // Estado del formulario
  const [logoUrl, setLogoUrl] = useState("");
  const [colorPrimario, setColorPrimario] = useState("#FF5E14");
  const [nombreFantasia, setNombreFantasia] = useState("");
  const [favicon, setFavicon] = useState("");

  // UI
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<"desktop" | "mobile">("desktop");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos actuales
  useEffect(() => {
    if (!entidadData) return;
    setLogoUrl(entidadData.configuracion?.logoUrl || "");
    setColorPrimario(entidadData.configuracion?.colorPrimario || "#FF5E14");
    setNombreFantasia(entidadData.nombreFantasia || "");
    setFavicon(entidadData.configuracion?.faviconUrl || "");
  }, [entidadData]);

  // ── Subir logo ──
  const subirLogo = async (file: File) => {
    setSubiendo(true);
    try {
      const storageRef = ref(storage, `entidades/${entidadData?.id}/logo_${Date.now()}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      setLogoUrl(url);
    } catch { alert("Error al subir el logo."); }
    finally { setSubiendo(false); }
  };

  // ── Subir favicon ──
  const subirFavicon = async (file: File) => {
    setSubiendo(true);
    try {
      const storageRef = ref(storage, `entidades/${entidadData?.id}/favicon_${Date.now()}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      setFavicon(url);
    } catch { alert("Error al subir el favicon."); }
    finally { setSubiendo(false); }
  };

  // ── Guardar cambios ──
  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        nombreFantasia,
        "configuracion.logoUrl": logoUrl,
        "configuracion.colorPrimario": colorPrimario,
        "configuracion.faviconUrl": favicon,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  // ── Preview items del menú ──
  const menuItems = [
    "Dashboard", "Nuevo Legajo", "Panel de Aprobacion",
    "Cartera Activa", "Reportes",
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Identidad de Marca</h1>
          <p className="text-gray-500 text-sm mt-1">Personalizá cómo se ve la plataforma para tu entidad</p>
        </div>
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          style={{ backgroundColor: colorPrimario }}>
          {guardando ? <Loader2 size={18} className="animate-spin" /> :
           guardado ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {guardado ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── PANEL IZQUIERDO: CONFIGURACIÓN ── */}
        <div className="space-y-6">

          {/* NOMBRE */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Type size={18} style={{ color: colorPrimario }} />
              <p className="text-sm font-black uppercase tracking-widest text-gray-400">Nombre de la Entidad</p>
            </div>
            <input
              type="text" value={nombreFantasia} onChange={e => setNombreFantasia(e.target.value)}
              placeholder="Ej: CrediMendoza, FinanSur..."
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
            />
            <p className="text-xs text-gray-600 mt-2">Aparece en el sidebar y en los documentos generados.</p>
          </div>

          {/* LOGO */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Image size={18} style={{ color: colorPrimario }} />
              <p className="text-sm font-black uppercase tracking-widest text-gray-400">Logo</p>
            </div>

            <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) subirLogo(f); }} />

            <div
              onClick={() => logoInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-gray-500 transition-colors mb-4">
              {subiendo ? (
                <Loader2 size={24} className="animate-spin text-gray-500" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-20 object-contain" />
              ) : (
                <>
                  <Upload size={28} className="text-gray-600" />
                  <p className="text-sm text-gray-500">Tocá para subir tu logo</p>
                  <p className="text-xs text-gray-600">PNG o SVG recomendado. Fondo transparente ideal.</p>
                </>
              )}
            </div>

            {logoUrl && (
              <button onClick={() => logoInputRef.current?.click()}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Cambiar logo →
              </button>
            )}
          </div>

          {/* FAVICON */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Monitor size={18} style={{ color: colorPrimario }} />
              <p className="text-sm font-black uppercase tracking-widest text-gray-400">Favicon</p>
            </div>

            <input ref={faviconInputRef} type="file" accept="image/*,.ico" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) subirFavicon(f); }} />

            <div className="flex items-center gap-4">
              <div
                onClick={() => faviconInputRef.current?.click()}
                className="w-16 h-16 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-gray-500 transition-colors overflow-hidden">
                {favicon
                  ? <img src={favicon} alt="Favicon" className="w-full h-full object-contain" />
                  : <Upload size={20} className="text-gray-600" />}
              </div>
              <div>
                <p className="text-sm text-gray-300 font-bold">Ícono del navegador</p>
                <p className="text-xs text-gray-600 mt-1">PNG cuadrado de 32×32px o 64×64px</p>
                <button onClick={() => faviconInputRef.current?.click()}
                  className="text-xs mt-2 hover:text-gray-300 transition-colors" style={{ color: colorPrimario }}>
                  {favicon ? "Cambiar favicon →" : "Subir favicon →"}
                </button>
              </div>
            </div>
          </div>

          {/* COLOR PRIMARIO */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={18} style={{ color: colorPrimario }} />
              <p className="text-sm font-black uppercase tracking-widest text-gray-400">Color Primario</p>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {COLORES_PRESET.map(c => (
                <button key={c} onClick={() => setColorPrimario(c)}
                  className={`w-full aspect-square rounded-xl transition-all ${colorPrimario === c ? "ring-2 ring-white scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>

            {/* Color picker manual */}
            <div className="flex items-center gap-3">
              <input type="color" value={colorPrimario} onChange={e => setColorPrimario(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
              <input type="text" value={colorPrimario} onChange={e => setColorPrimario(e.target.value)}
                className="flex-1 bg-[#111] border border-gray-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-gray-500" />
              <div className="w-10 h-10 rounded-xl border border-gray-700" style={{ backgroundColor: colorPrimario }} />
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO: PREVIEW EN VIVO ── */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 sticky top-8 h-fit">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Eye size={16} style={{ color: colorPrimario }} />
              <p className="text-sm font-black uppercase tracking-widest text-gray-400">Preview en vivo</p>
            </div>
            <div className="flex bg-gray-900 rounded-lg overflow-hidden">
              <button onClick={() => setVistaPrevia("desktop")}
                className={`p-2 transition-colors ${vistaPrevia === "desktop" ? "text-white" : "text-gray-600"}`}
                style={vistaPrevia === "desktop" ? { backgroundColor: colorPrimario } : {}}>
                <Monitor size={14} />
              </button>
              <button onClick={() => setVistaPrevia("mobile")}
                className={`p-2 transition-colors ${vistaPrevia === "mobile" ? "text-white" : "text-gray-600"}`}
                style={vistaPrevia === "mobile" ? { backgroundColor: colorPrimario } : {}}>
                <Smartphone size={14} />
              </button>
            </div>
          </div>

          {/* PREVIEW DESKTOP: Sidebar */}
          {vistaPrevia === "desktop" && (
            <div className="bg-[#050505] rounded-xl overflow-hidden border border-gray-900 flex" style={{ height: 380 }}>
              {/* Sidebar simulado */}
              <div className="w-48 bg-[#0A0A0A] border-r border-gray-900 flex flex-col p-3 shrink-0">
                {/* Logo */}
                <div className="flex items-center gap-2 p-2 mb-4">
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" className="h-7 object-contain max-w-[120px]" />
                    : <>
                        <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-black"
                          style={{ backgroundColor: colorPrimario }}>
                          {nombreFantasia?.[0] || "S"}
                        </div>
                        <span className="text-white font-black text-sm italic truncate">
                          {nombreFantasia || "Simply"}
                        </span>
                      </>
                  }
                </div>

                {/* Items del menu */}
                <div className="space-y-1 flex-1">
                  {menuItems.map((item, i) => (
                    <div key={item}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${i === 0 ? "text-white" : "text-gray-500"}`}
                      style={i === 0 ? {
                        backgroundColor: `${colorPrimario}22`,
                        border: `1px solid ${colorPrimario}44`,
                      } : {}}>
                      <div className="w-3 h-3 rounded-sm opacity-40"
                        style={i === 0 ? { backgroundColor: colorPrimario } : { backgroundColor: "#6b7280" }} />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>

                {/* User */}
                <div className="border-t border-gray-800 pt-2 mt-2">
                  <p className="text-[10px] text-gray-500 truncate px-2">gerente@entidad.com</p>
                  <p className="text-[9px] uppercase tracking-wider px-2" style={{ color: colorPrimario }}>GERENTE GENERAL</p>
                </div>
              </div>

              {/* Contenido simulado */}
              <div className="flex-1 p-4 space-y-3">
                <div className="h-5 bg-gray-800 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-[#111] border border-gray-800 rounded-lg p-3 space-y-2">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: `${colorPrimario}33` }} />
                      <div className="h-3 bg-gray-800 rounded w-3/4" />
                      <div className="h-4 bg-gray-700 rounded w-1/2" />
                    </div>
                  ))}
                </div>
                <div className="bg-[#111] border border-gray-800 rounded-lg p-3 space-y-2">
                  <div className="h-3 bg-gray-800 rounded w-1/4" />
                  <div className="h-2 bg-gray-900 rounded w-full">
                    <div className="h-2 rounded" style={{ width: "60%", backgroundColor: colorPrimario }} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="px-4 py-2 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: colorPrimario }}>
                    Guardar
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW MOBILE: Header */}
          {vistaPrevia === "mobile" && (
            <div className="mx-auto" style={{ maxWidth: 220 }}>
              <div className="bg-[#050505] rounded-2xl overflow-hidden border border-gray-800" style={{ height: 380 }}>
                {/* Header mobile */}
                <div className="flex items-center justify-between bg-[#0A0A0A] border-b border-gray-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    {logoUrl
                      ? <img src={logoUrl} alt="Logo" className="h-6 object-contain" />
                      : <>
                          <div className="w-6 h-6 rounded text-white text-xs font-black flex items-center justify-center"
                            style={{ backgroundColor: colorPrimario }}>
                            {nombreFantasia?.[0] || "S"}
                          </div>
                          <span className="text-white font-black text-xs italic">{nombreFantasia || "Simply"}</span>
                        </>
                    }
                  </div>
                  <div className="space-y-1">
                    <div className="w-4 h-0.5 bg-gray-500 rounded" />
                    <div className="w-4 h-0.5 bg-gray-500 rounded" />
                    <div className="w-4 h-0.5 bg-gray-500 rounded" />
                  </div>
                </div>
                {/* Contenido mobile */}
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-800 rounded w-2/3" />
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-[#111] border border-gray-800 rounded-lg p-2 flex items-center gap-2">
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: `${colorPrimario}33` }} />
                      <div className="h-2 bg-gray-800 rounded flex-1" />
                    </div>
                  ))}
                  <div className="w-full py-2 rounded-lg text-center text-xs font-bold text-white mt-2"
                    style={{ backgroundColor: colorPrimario }}>
                    Nuevo Legajo
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-600 text-center mt-3">
            Los cambios se aplican en toda la plataforma al guardar.
          </p>
        </div>
      </div>
    </div>
  );
}
