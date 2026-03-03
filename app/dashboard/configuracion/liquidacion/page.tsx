"use client";
// app/dashboard/configuracion/liquidacion/page.tsx
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Save, Loader2, CheckCircle2, Lock, Info } from "lucide-react";

export default function ConfigLiquidacionPage() {
  const { entidadData, userData } = useAuth();
  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [cfg, setCfg] = useState({
    validarCbu:             true,
    validarFirma:           true,
    validarLegajo:          false,
    whatsappAuto:           true,
    registrarTransferencia: true,
    exportarExcel:          true,
    requierePin:            false,
    pin:                    "",
  });
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ok,        setOk]        = useState(false);
  const [mostrarPin,setMostrarPin]= useState(false);

  const puedeEditar = ["GERENTE_GENERAL","MASTER_PAYSUR"].includes(userData?.rol || "");

  useEffect(() => {
    const cargar = async () => {
      if (!entidadData?.id) return;
      const snap = await getDoc(doc(db, "entidades", entidadData.id));
      const saved = snap.data()?.configuracion?.liquidacionMasiva;
      if (saved) setCfg(prev => ({ ...prev, ...saved }));
      setCargando(false);
    };
    cargar();
  }, [entidadData]);

  const guardar = async () => {
    if (!entidadData?.id) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "entidades", entidadData.id), {
        "configuracion.liquidacionMasiva": cfg,
      });
      setOk(true); setTimeout(() => setOk(false), 3000);
    } finally { setGuardando(false); }
  };

  const set = (key: string, value: any) => setCfg(prev => ({ ...prev, [key]: value }));

  const Toggle = ({ k, label, desc }: { k: string; label: string; desc?: string }) => (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        {desc && <p className="text-[10px] text-gray-600 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => puedeEditar && set(k, !(cfg as any)[k])} disabled={!puedeEditar}
        className="w-10 h-5 rounded-full transition-all relative shrink-0 mt-0.5 disabled:opacity-50"
        style={{ backgroundColor: (cfg as any)[k] ? colorPrimario : "#374151" }}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${(cfg as any)[k] ? "left-5" : "left-0.5"}`}/>
      </button>
    </div>
  );

  if (cargando) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-gray-600" size={22}/></div>;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Liquidación Masiva</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configuración del módulo por entidad</p>
        </div>
        {puedeEditar && (
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: colorPrimario }}>
            {guardando ? <Loader2 size={13} className="animate-spin"/> : ok ? <CheckCircle2 size={13}/> : <Save size={13}/>}
            {ok ? "Guardado" : "Guardar"}
          </button>
        )}
      </div>

      {/* Validaciones */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Validaciones previas al lote</p>
        <Toggle k="validarCbu"    label="Validar CBU"    desc="Bloquea ops sin CBU cargado"/>
        <div className="h-px bg-gray-900"/>
        <Toggle k="validarFirma"  label="Validar firma"  desc="Bloquea ops sin firma digital"/>
        <div className="h-px bg-gray-900"/>
        <Toggle k="validarLegajo" label="Validar legajo completo" desc="Bloquea ops sin DNI frente/dorso"/>
      </div>

      {/* Funciones */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Funciones del módulo</p>
        <Toggle k="whatsappAuto"           label="WhatsApp automático al liquidar" desc="Notifica al cliente con monto y CBU al ejecutar el lote"/>
        <div className="h-px bg-gray-900"/>
        <Toggle k="registrarTransferencia" label="Registro de número de transferencia" desc="Campo por operación para ingresar el Nro de CBU/transferencia"/>
        <div className="h-px bg-gray-900"/>
        <Toggle k="exportarExcel"          label="Exportar Excel del lote"         desc="Botón para descargar el lote como planilla antes de ejecutar"/>
      </div>

      {/* PIN de confirmación */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 space-y-4">
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Seguridad</p>
        <Toggle k="requierePin" label="Requerir PIN para ejecutar" desc="Solicita un código de confirmación antes de liquidar el lote"/>

        {cfg.requierePin && (
          <div className="space-y-2 pt-1">
            <label className="block text-xs text-gray-500 uppercase font-bold">PIN de aprobación</label>
            <div className="flex gap-2">
              <input
                type={mostrarPin ? "text" : "password"}
                maxLength={8}
                value={cfg.pin}
                onChange={e => set("pin", e.target.value)}
                disabled={!puedeEditar}
                placeholder="Definir PIN (máx 8 dígitos)"
                className="flex-1 bg-[#111] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none tracking-widest disabled:opacity-50"/>
              <button onClick={() => setMostrarPin(!mostrarPin)}
                className="px-3 border border-gray-700 rounded-xl text-gray-500 hover:text-white transition-colors">
                <Lock size={14}/>
              </button>
            </div>
            <p className="text-[10px] text-gray-600">Solo lo conocen los usuarios con permiso de liquidar.</p>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-500 bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4">
        <Info size={12} className="shrink-0 mt-0.5 text-blue-400"/>
        Solo usuarios con rol GERENTE_GENERAL o LIQUIDADOR pueden ejecutar lotes. La configuración aplica solo a esta entidad.
      </div>
    </div>
  );
}
