"use client";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Plus, Trash2, GripVertical, Save, Loader2,
  CheckCircle2, Type, Hash, Calendar, Camera, Paperclip
} from "lucide-react";

type TipoCampo = "texto" | "numero" | "fecha" | "foto" | "archivo";

interface CampoExtra {
  id: string;
  label: string;
  tipo: TipoCampo;
  requerido: boolean;
}

const TIPOS: { tipo: TipoCampo; label: string; icon: React.ReactNode }[] = [
  { tipo: "texto",   label: "Texto",   icon: <Type size={14}/>      },
  { tipo: "numero",  label: "Número",  icon: <Hash size={14}/>      },
  { tipo: "fecha",   label: "Fecha",   icon: <Calendar size={14}/>  },
  { tipo: "foto",    label: "Foto",    icon: <Camera size={14}/>    },
  { tipo: "archivo", label: "Archivo", icon: <Paperclip size={14}/> },
];

const MAX_CAMPOS = 10;

export default function ConfigCamposExtraPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [campos,    setCampos]   = useState<CampoExtra[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [ok,        setOk]       = useState(false);
  const [cargando,  setCargando] = useState(true);

  // Cargar campos guardados
  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      try {
        const snap = await getDoc(doc(db, "entidades", entidadData.id));
        const guardados = snap.data()?.configuracion?.camposExtraOnboarding || [];
        setCampos(guardados);
      } finally { setCargando(false); }
    };
    cargar();
  }, [entidadData]);

  const agregarCampo = () => {
    if (campos.length >= MAX_CAMPOS) return;
    setCampos(prev => [...prev, {
      id:        `campo_${Date.now()}`,
      label:     "",
      tipo:      "texto",
      requerido: false,
    }]);
  };

  const actualizarCampo = (id: string, key: keyof CampoExtra, value: any) => {
    setCampos(prev => prev.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const eliminarCampo = (id: string) => {
    setCampos(prev => prev.filter(c => c.id !== id));
  };

  const moverCampo = (idx: number, dir: -1 | 1) => {
    const nueva = [...campos];
    const target = idx + dir;
    if (target < 0 || target >= nueva.length) return;
    [nueva[idx], nueva[target]] = [nueva[target], nueva[idx]];
    setCampos(nueva);
  };

  const guardar = async () => {
    if (!entidadData?.id) return;
    // Validar que todos tengan label
    if (campos.some(c => !c.label.trim())) {
      alert("Todos los campos deben tener un nombre.");
      return;
    }
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.camposExtraOnboarding": campos,
      });
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Error al guardar.");
    } finally { setGuardando(false); }
  };

  const puedeEditar = ["GERENTE_GENERAL", "MASTER_PAYSUR"].includes(userData?.rol || "");

  if (cargando) return (
    <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={24}/></div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Campos del Onboarding</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Hasta {MAX_CAMPOS} campos extra que el cliente completa desde el magic link.
            Aparecen después de la firma.
          </p>
        </div>
        {puedeEditar && (
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: colorPrimario }}>
            {guardando ? <Loader2 size={14} className="animate-spin"/> : ok ? <CheckCircle2 size={14}/> : <Save size={14}/>}
            {ok ? "Guardado" : "Guardar"}
          </button>
        )}
      </div>

      {/* Lista de campos */}
      <div className="space-y-3">
        {campos.length === 0 && (
          <div className="bg-[#0A0A0A] border border-dashed border-gray-700 rounded-2xl p-10 text-center">
            <p className="text-gray-600 text-sm">Sin campos extra configurados.</p>
            <p className="text-gray-700 text-xs mt-1">El onboarding incluirá solo: DNI, selfie y firma.</p>
          </div>
        )}

        {campos.map((campo, idx) => (
          <div key={campo.id}
            className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 flex gap-3 items-start">

            {/* Orden */}
            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
              <button onClick={() => moverCampo(idx, -1)} disabled={idx === 0 || !puedeEditar}
                className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors text-xs leading-none">▲</button>
              <span className="text-[10px] text-gray-600 font-bold">{idx + 1}</span>
              <button onClick={() => moverCampo(idx, 1)} disabled={idx === campos.length - 1 || !puedeEditar}
                className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors text-xs leading-none">▼</button>
            </div>

            {/* Configuración */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Nombre del campo */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Nombre del campo</label>
                <input
                  value={campo.label}
                  onChange={e => actualizarCampo(campo.id, "label", e.target.value)}
                  disabled={!puedeEditar}
                  maxLength={50}
                  placeholder="Ej: Recibo de sueldo, CUIL, Número de legajo..."
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50"/>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Tipo</label>
                <select value={campo.tipo}
                  onChange={e => actualizarCampo(campo.id, "tipo", e.target.value)}
                  disabled={!puedeEditar}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50">
                  {TIPOS.map(t => (
                    <option key={t.tipo} value={t.tipo}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Requerido + preview tipo */}
              <div className="sm:col-span-3 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => puedeEditar && actualizarCampo(campo.id, "requerido", !campo.requerido)}
                    className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${campo.requerido ? "" : "bg-gray-700"}`}
                    style={{ backgroundColor: campo.requerido ? colorPrimario : "" }}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${campo.requerido ? "left-5" : "left-0.5"}`}/>
                  </div>
                  <span className="text-xs text-gray-400">Campo obligatorio</span>
                </label>

                <div className="flex items-center gap-1 text-xs text-gray-600">
                  {TIPOS.find(t => t.tipo === campo.tipo)?.icon}
                  <span>{TIPOS.find(t => t.tipo === campo.tipo)?.label}</span>
                </div>
              </div>
            </div>

            {/* Eliminar */}
            {puedeEditar && (
              <button onClick={() => eliminarCampo(campo.id)}
                className="text-gray-600 hover:text-red-400 transition-colors pt-1 shrink-0">
                <Trash2 size={16}/>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Agregar campo */}
      {puedeEditar && campos.length < MAX_CAMPOS && (
        <button onClick={agregarCampo}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition-all text-sm font-bold flex items-center justify-center gap-2">
          <Plus size={16}/> Agregar campo ({campos.length}/{MAX_CAMPOS})
        </button>
      )}
      {campos.length >= MAX_CAMPOS && (
        <p className="text-center text-xs text-gray-600">Límite de {MAX_CAMPOS} campos alcanzado.</p>
      )}

      {/* Info */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-bold text-gray-400">Tipos de campo disponibles</p>
        <div className="grid grid-cols-2 gap-1">
          {TIPOS.map(t => (
            <div key={t.tipo} className="flex items-center gap-1.5">
              <span className="text-gray-600">{t.icon}</span>
              <span><strong className="text-gray-400">{t.label}:</strong> {
                t.tipo === "texto"   ? "Respuesta libre" :
                t.tipo === "numero"  ? "Solo dígitos" :
                t.tipo === "fecha"   ? "Selector de fecha" :
                t.tipo === "foto"    ? "Cámara o galería" :
                "Cualquier archivo"
              }</span>
            </div>
          ))}
        </div>
        <p className="pt-1 text-gray-600">Los campos aparecen en el paso 6 del onboarding, antes de la confirmación final. Las fotos y archivos se guardan en Firebase Storage.</p>
      </div>
    </div>
  );
}
