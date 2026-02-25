"use client";

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, MapPin, PenTool, Type, FileText, CheckCircle2 } from "lucide-react";

export default function MapeadorPage() {
  const { userData, entidadData } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const [plantilla, setPlantilla] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [campoActivo, setCampoActivo] = useState<string | null>(null);
  const [coordenadas, setCoordenadas] = useState<{ [key: string]: { x: number, y: number } }>({});
  
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cargarPlantilla = async () => {
      if (!userData || !params?.id) return;
      try {
        const docRef = doc(db, "plantillas", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().entidadId === userData.entidadId) {
          const data = docSnap.data();
          setPlantilla({ id: docSnap.id, ...data });
          if (data.coordenadas) {
            setCoordenadas(data.coordenadas);
          }
        } else {
          router.push("/dashboard/plantillas");
        }
      } catch (error) {
        console.error("Error al cargar:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarPlantilla();
  }, [userData, params.id, router]);

  const handleDocumentClick = (e: React.MouseEvent) => {
    if (!campoActivo || !areaRef.current) return;

    const rect = areaRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setCoordenadas(prev => ({
      ...prev,
      [campoActivo]: { x, y }
    }));
    setCampoActivo(null);
  };

  const guardarMapeo = async () => {
    if (!plantilla) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "plantillas", plantilla.id), {
        coordenadas: coordenadas,
        mapeoConfigurado: Object.keys(coordenadas).length > 0,
        fechaActualizacion: serverTimestamp()
      });
      setMensaje("Coordenadas guardadas exitosamente.");
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar el mapeo");
    } finally {
      setGuardando(false);
    }
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const CAMPOS_DISPONIBLES = [
    { id: "firmaTitular", nombre: "Firma del Cliente", icon: <PenTool size={16} /> },
    { id: "aclaracion", nombre: "Aclaracion (Nombre)", icon: <Type size={16} /> },
    { id: "dni", nombre: "Nro. de DNI", icon: <Type size={16} /> },
    { id: "fecha", nombre: "Fecha de Emision", icon: <Type size={16} /> },
    { id: "monto", nombre: "Monto Solicitado", icon: <Type size={16} /> }
  ];

  if (cargando) return <div className="p-8 flex justify-center mt-20"><Loader2 className="animate-spin text-gray-500" size={40} /></div>;
  if (!plantilla) return null;

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[#F8F9FA] font-sans">
      <header className="bg-[#0A0A0A] border-b border-gray-800 p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard/plantillas")} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-white flex items-center gap-2">
              <MapPin size={18} style={{ color: colorPrimario }} /> Mapeador de PDF
            </h1>
            <p className="text-xs text-gray-400">Archivo: {plantilla.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {mensaje && <span className="text-green-500 text-sm font-medium flex items-center gap-1"><CheckCircle2 size={16} /> {mensaje}</span>}
          <button 
            onClick={guardarMapeo}
            disabled={guardando}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colorPrimario }}
          >
            {guardando ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Guardar Coordenadas
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-[#0A0A0A] border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h2 className="font-bold text-white mb-2">Instrucciones</h2>
            <p className="text-sm text-gray-400">
              1. Selecciona un campo de la lista.<br/>
              2. Haz clic en el documento para fijar su posicion.<br/>
              3. Guarda los cambios.
            </p>
          </div>
          
          <div>
            <h2 className="font-bold text-white mb-4 border-b border-gray-800 pb-2">Campos a Mapear</h2>
            <div className="space-y-3">
              {CAMPOS_DISPONIBLES.map(campo => {
                const isMapped = coordenadas[campo.id];
                const isActivo = campoActivo === campo.id;
                
                return (
                  <button
                    key={campo.id}
                    onClick={() => setCampoActivo(isActivo ? null : campo.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isActivo 
                        ? 'bg-gray-900 border-white text-white shadow-lg scale-105' 
                        : isMapped 
                          ? 'bg-[#111] border-gray-700 text-gray-300' 
                          : 'bg-[#0A0A0A] border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {campo.icon}
                      <span className="text-sm font-medium">{campo.nombre}</span>
                    </div>
                    {isMapped && <CheckCircle2 size={16} className="text-green-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[#111] p-8 overflow-auto flex justify-center items-start">
          <div 
            ref={areaRef}
            onClick={handleDocumentClick}
            className={`relative bg-white shadow-2xl rounded-sm w-full max-w-[800px] aspect-[1/1.414] overflow-hidden ${campoActivo ? 'cursor-crosshair' : 'cursor-default'}`}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <iframe 
                src={`${plantilla.archivoUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full border-0 pointer-events-none"
                title="Visor PDF"
              />
            </div>
            
            {Object.entries(coordenadas).map(([id, pos]) => {
              const campoInfo = CAMPOS_DISPONIBLES.find(c => c.id === id);
              return (
                <div 
                  key={id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded shadow-lg border border-white whitespace-nowrap z-20 pointer-events-none flex items-center gap-1"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, backgroundColor: colorPrimario }}
                >
                  <MapPin size={12} /> {campoInfo?.nombre}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
