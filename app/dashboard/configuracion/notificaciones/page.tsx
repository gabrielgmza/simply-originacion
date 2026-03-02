"use client";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Save, Loader2, CheckCircle2, Bell } from "lucide-react";
import { NOTIF_CONFIG, TipoNotificacion } from "@/lib/notificaciones/internas";

const ROLES = [
  { key: "GERENTE_GENERAL",     label: "Gerente General" },
  { key: "GERENTE_SUCURSAL",    label: "Gerente Sucursal" },
  { key: "SUPERVISOR_SUCURSAL", label: "Supervisor" },
  { key: "VENDEDOR",            label: "Vendedor" },
  { key: "LIQUIDADOR",         label: "Liquidador" },
];

// Config por defecto: todos los eventos activos
const defaultConfig = (): Record<TipoNotificacion, boolean> =>
  Object.keys(NOTIF_CONFIG).reduce((acc, k) => ({ ...acc, [k]: true }), {} as any);

export default function ConfigNotificacionesPage() {
  const { entidadData } = useAuth();
  const [config, setConfig] = useState<Record<TipoNotificacion, boolean>>(defaultConfig());
  // Roles editables por tipo: entidad puede restringir qué roles reciben cada tipo
  const [rolesConfig, setRolesConfig] = useState<Record<TipoNotificacion, string[]>>(
    Object.keys(NOTIF_CONFIG).reduce((acc, k) => ({
      ...acc,
      [k]: NOTIF_CONFIG[k as TipoNotificacion].rolesDestino
    }), {} as any)
  );
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);
  const [loading, setLoading]     = useState(true);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      try {
        const snap = await getDoc(doc(db, "entidades", entidadData.id));
        const d = snap.data()?.configuracion;
        if (d?.notificacionesInternas)  setConfig(prev => ({ ...prev, ...d.notificacionesInternas }));
        if (d?.notificacionesRoles)     setRolesConfig(prev => ({ ...prev, ...d.notificacionesRoles }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    cargar();
  }, [entidadData]);

  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.notificacionesInternas": config,
        "configuracion.notificacionesRoles": rolesConfig,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  const toggleRol = (tipo: TipoNotificacion, rol: string) => {
    setRolesConfig(prev => {
      const actual = prev[tipo] || [];
      return {
        ...prev,
        [tipo]: actual.includes(rol)
          ? actual.filter(r => r !== rol)
          : [...actual, rol]
      };
    });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={28} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Notificaciones</h1>
          <p className="text-gray-500 text-sm mt-1">Configurá qué alertas recibe cada rol</p>
        </div>
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-all"
          style={{ backgroundColor: colorPrimario }}>
          {guardando ? <Loader2 size={15} className="animate-spin" /> :
           guardado  ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {guardado ? "¡Guardado!" : "Guardar"}
        </button>
      </div>

      <div className="space-y-3">
        {(Object.keys(NOTIF_CONFIG) as TipoNotificacion[]).map(tipo => {
          const cfg = NOTIF_CONFIG[tipo];
          const activo = config[tipo] !== false;
          return (
            <div key={tipo} className={`bg-[#0A0A0A] border rounded-2xl p-5 transition-opacity ${!activo ? "opacity-50" : ""}`}
              style={{ borderColor: activo ? `${cfg.color}33` : "#1f2937" }}>

              {/* Fila principal */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cfg.emoji}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{cfg.label}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{tipo.replace(/_/g, " ")}</p>
                  </div>
                </div>
                {/* Toggle activo/inactivo */}
                <button onClick={() => setConfig(p => ({ ...p, [tipo]: !p[tipo] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${activo ? "bg-green-500" : "bg-gray-700"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${activo ? "left-5" : "left-0.5"}`} />
                </button>
              </div>

              {/* Roles que reciben esta notificación */}
              {activo && (
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Reciben esta alerta:</p>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map(rol => {
                      const seleccionado = rolesConfig[tipo]?.includes(rol.key);
                      return (
                        <button key={rol.key}
                          onClick={() => toggleRol(tipo, rol.key)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                            seleccionado
                              ? "text-white border-transparent"
                              : "text-gray-600 border-gray-700 hover:border-gray-500"
                          }`}
                          style={seleccionado ? { backgroundColor: cfg.color } : {}}>
                          {rol.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
