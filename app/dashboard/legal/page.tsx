"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { VARIABLES_DISPONIBLES, CATEGORIAS } from "@/lib/legal/variables";
import {
  FileText, Plus, Trash2, Upload, Loader2, Save, CheckCircle2,
  Copy, ChevronDown, ChevronUp, Info, X, Eye
} from "lucide-react";

type ProductoKey = "CUAD" | "PRIVADO" | "ADELANTO" | "GENERAL";

const PRODUCTOS_LEGAL: { key: ProductoKey; label: string; color: string }[] = [
  { key: "GENERAL",  label: "General (todos los productos)", color: "#6b7280" },
  { key: "CUAD",     label: "Descuento por Haberes",         color: "#8b5cf6" },
  { key: "PRIVADO",  label: "Crédito Personal",              color: "#3b82f6" },
  { key: "ADELANTO", label: "Adelanto de Sueldo",            color: "#10b981" },
];

interface Plantilla {
  id: string;
  titulo: string;
  tipo: string;        // "CONTRATO_MUTUO", "PAGARE", "TYC", "AUTORIZACION_DEBITO", "DDJJ", "OTRO"
  producto: ProductoKey;
  contenidoTexto?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  fechaCreacion: any;
}

const TIPOS_DOC = [
  { value: "CONTRATO_MUTUO",      label: "Contrato de Mutuo" },
  { value: "PAGARE",              label: "Pagaré" },
  { value: "TYC",                 label: "Términos y Condiciones" },
  { value: "AUTORIZACION_DEBITO", label: "Autorización de Débito" },
  { value: "DDJJ",                label: "Declaración Jurada" },
  { value: "OTRO",                label: "Otro documento" },
];

export default function PlantillasLegalesPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalVars, setModalVars]   = useState(false);
  const [guardando, setGuardando]   = useState(false);
  const [copiado, setCopiado]       = useState("");
  const [filtroProducto, setFiltroProducto] = useState<ProductoKey | "TODOS">("TODOS");

  // Form nueva plantilla
  const [titulo, setTitulo]         = useState("");
  const [tipo, setTipo]             = useState("CONTRATO_MUTUO");
  const [producto, setProducto]     = useState<ProductoKey>("GENERAL");
  const [contenido, setContenido]   = useState("");
  const [archivo, setArchivo]       = useState<File | null>(null);
  const [modoEdicion, setModoEdicion] = useState<"texto" | "archivo">("archivo");

  const puedeEditar = ["GERENTE_GENERAL", "MASTER_PAYSUR"].includes(userData?.rol || "");

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      setCargando(true);
      try {
        const snap = await getDocs(
          query(collection(db, "plantillas_legales"), where("entidadId", "==", entidadData.id))
        );
        setPlantillas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plantilla)));
      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    };
    cargar();
  }, [entidadData]);

  const guardar = async () => {
    if (!entidadData?.id || !titulo) return;
    setGuardando(true);
    try {
      let archivoUrl = "";
      let archivoNombre = "";

      // Subir archivo si hay
      if (modoEdicion === "archivo" && archivo) {
        const storage = getStorage();
        const storageRef = ref(storage, `plantillas/${entidadData.id}/${Date.now()}_${archivo.name}`);
        await uploadBytes(storageRef, archivo);
        archivoUrl = await getDownloadURL(storageRef);
        archivoNombre = archivo.name;
      }

      await addDoc(collection(db, "plantillas_legales"), {
        entidadId: entidadData.id,
        titulo,
        tipo,
        producto,
        contenidoTexto: modoEdicion === "texto" ? contenido : null,
        archivoUrl: archivoUrl || null,
        archivoNombre: archivoNombre || null,
        fechaCreacion: serverTimestamp(),
        creadoPor: userData?.email || "sistema",
      });

      // Reset form
      setTitulo(""); setContenido(""); setArchivo(null);
      setModalNueva(false);

      // Recargar
      const snap = await getDocs(
        query(collection(db, "plantillas_legales"), where("entidadId", "==", entidadData.id))
      );
      setPlantillas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plantilla)));
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setGuardando(false); }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    await deleteDoc(doc(db, "plantillas_legales", id));
    setPlantillas(prev => prev.filter(p => p.id !== id));
  };

  const copiarVariable = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiado(key);
    setTimeout(() => setCopiado(""), 2000);
  };

  const plantillasFiltradas = filtroProducto === "TODOS"
    ? plantillas
    : plantillas.filter(p => p.producto === filtroProducto);

  if (cargando) return (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Plantillas Legales</h1>
          <p className="text-gray-500 text-sm mt-0.5">Contratos, pagarés y documentos por producto</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalVars(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-sm font-bold">
            <Info size={13} /> Variables
          </button>
          {puedeEditar && (
            <button onClick={() => setModalNueva(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-bold text-sm"
              style={{ backgroundColor: colorPrimario }}>
              <Plus size={13} /> Nueva plantilla
            </button>
          )}
        </div>
      </div>

      {/* Filtro por producto */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFiltroProducto("TODOS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            filtroProducto === "TODOS" ? "border-white/30 bg-white/10 text-white" : "border-gray-800 text-gray-500"
          }`}>Todos</button>
        {PRODUCTOS_LEGAL.map(p => (
          <button key={p.key} onClick={() => setFiltroProducto(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              filtroProducto === p.key ? "border-white/30 bg-white/10 text-white" : "border-gray-800 text-gray-500"
            }`}>{p.label}</button>
        ))}
      </div>

      {/* Lista de plantillas */}
      {plantillasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p>No hay plantillas configuradas{filtroProducto !== "TODOS" ? " para este producto" : ""}.</p>
          {puedeEditar && <p className="text-xs text-gray-700 mt-1">Subí tus contratos en DOCX o PDF con variables {"{{"}cliente.nombre{"}}"}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {plantillasFiltradas.map(p => {
            const prodInfo = PRODUCTOS_LEGAL.find(pr => pr.key === p.producto);
            const tipoInfo = TIPOS_DOC.find(t => t.value === p.tipo);
            return (
              <div key={p.id} className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gray-900">
                    <FileText size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{p.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${prodInfo?.color || "#666"}20`, color: prodInfo?.color || "#666" }}>
                        {prodInfo?.label || p.producto}
                      </span>
                      <span className="text-[10px] text-gray-500">{tipoInfo?.label || p.tipo}</span>
                      {p.archivoNombre && <span className="text-[10px] text-gray-600">· {p.archivoNombre}</span>}
                    </div>
                  </div>
                </div>
                {puedeEditar && (
                  <button onClick={() => eliminar(p.id)} className="text-gray-600 hover:text-red-400 p-2">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva plantilla */}
      {modalNueva && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setModalNueva(false)}>
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <p className="font-black text-white">Nueva Plantilla Legal</p>
              <button onClick={() => setModalNueva(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Título del documento</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Contrato de Mutuo - Crédito Personal"
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Tipo de documento</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                    {TIPOS_DOC.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Producto</label>
                  <select value={producto} onChange={e => setProducto(e.target.value as ProductoKey)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                    {PRODUCTOS_LEGAL.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Modo: archivo o texto */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Modo de carga</label>
                <div className="flex gap-2">
                  <button onClick={() => setModoEdicion("archivo")}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                      modoEdicion === "archivo" ? "border-white/30 bg-white/10 text-white" : "border-gray-800 text-gray-500"
                    }`}>Subir DOCX/PDF</button>
                  <button onClick={() => setModoEdicion("texto")}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                      modoEdicion === "texto" ? "border-white/30 bg-white/10 text-white" : "border-gray-800 text-gray-500"
                    }`}>Escribir texto</button>
                </div>
              </div>

              {modoEdicion === "archivo" ? (
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Archivo (DOCX o PDF)</label>
                  <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center">
                    <input type="file" accept=".docx,.pdf" onChange={e => setArchivo(e.target.files?.[0] || null)}
                      className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload size={24} className="mx-auto text-gray-500 mb-2" />
                      {archivo ? (
                        <p className="text-white font-bold text-sm">{archivo.name}</p>
                      ) : (
                        <p className="text-gray-500 text-sm">Click para seleccionar archivo</p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-1">Usá {"{{"}variable{"}}"}  en el documento. Ver botón "Variables" para la lista completa.</p>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Contenido con variables</label>
                  <textarea value={contenido} onChange={e => setContenido(e.target.value)} rows={12}
                    placeholder={"En la ciudad de {{fecha.lugar}}, entre {{entidad.razonSocial}} (CUIT {{entidad.cuit}}) en adelante EL PRESTADOR y {{cliente.nombre}} (DNI {{cliente.dni}}, CUIL {{cliente.cuil}}) en adelante EL PRESTATARIO..."}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none font-mono resize-y" />
                  <p className="text-[10px] text-gray-600 mt-1">Tip: usá {"{{"}variable{"}}"}  — ver botón "Variables" para la lista.</p>
                </div>
              )}

              <button onClick={guardar} disabled={guardando || !titulo}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: colorPrimario }}>
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {guardando ? "Guardando..." : "Guardar plantilla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal catálogo de variables */}
      {modalVars && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setModalVars(false)}>
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <p className="font-black text-white">Variables disponibles</p>
              <button onClick={() => setModalVars(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-6">
              <p className="text-xs text-gray-500">Usá estas variables en tus documentos. Al generar el contrato, se reemplazan automáticamente con los datos del cliente y la operación.</p>

              {CATEGORIAS.map(cat => (
                <div key={cat}>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-2">{cat}</p>
                  <div className="space-y-1">
                    {VARIABLES_DISPONIBLES.filter(v => v.categoria === cat).map(v => (
                      <div key={v.key} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-900 transition-all">
                        <div>
                          <span className="text-white text-sm font-mono">{`{{${v.key}}}`}</span>
                          <span className="text-gray-500 text-xs ml-2">— {v.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 italic">{v.ejemplo}</span>
                          <button onClick={() => copiarVariable(v.key)}
                            className="text-gray-600 hover:text-white p-1">
                            {copiado === v.key ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
