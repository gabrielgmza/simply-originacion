"use client";
// app/portal/[entidadId]/page.tsx
import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, ShieldCheck, Search, CheckCircle2,
  Clock, AlertTriangle, XCircle, ChevronDown,
  ChevronUp, Download, MessageSquare, CreditCard,
  DollarSign, Calendar, TrendingUp, FileText
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const ESTADO_INFO: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDIENTE_DOCS: { label: "Documentación pendiente", color: "text-orange-400", bg: "bg-orange-900/20", icon: <Clock size={14}/> },
  EN_REVISION:    { label: "En revisión",              color: "text-blue-400",   bg: "bg-blue-900/20",   icon: <Clock size={14}/> },
  APROBADO:       { label: "Aprobado",                 color: "text-green-400",  bg: "bg-green-900/20",  icon: <CheckCircle2 size={14}/> },
  LIQUIDADO:      { label: "Activo — cuotas corriendo",color: "text-green-400",  bg: "bg-green-900/20",  icon: <CheckCircle2 size={14}/> },
  EN_MORA:        { label: "En mora",                  color: "text-red-400",    bg: "bg-red-900/20",    icon: <AlertTriangle size={14}/> },
  FINALIZADO:     { label: "Cancelado",                color: "text-gray-400",   bg: "bg-gray-900/20",   icon: <CheckCircle2 size={14}/> },
  RECHAZADO:      { label: "Rechazado",                color: "text-red-400",    bg: "bg-red-900/20",    icon: <XCircle size={14}/> },
};

// Genera plan de cuotas en memoria (mismo algoritmo que el backend)
function generarPlanCuotas(op: any) {
  const cuotas    = op.financiero?.cuotas    || 0;
  const valorCuota= op.financiero?.valorCuota|| 0;
  const totalPagado = op.totalPagado         || 0;
  const inicio    = op.fechaLiquidacion ? new Date(op.fechaLiquidacion) : null;
  if (!inicio || !cuotas) return [];

  let saldoAcumulado = 0;
  return Array.from({ length: cuotas }, (_, i) => {
    const venc = new Date(inicio);
    venc.setMonth(venc.getMonth() + i + 1);
    const hoy  = new Date();
    saldoAcumulado += valorCuota;
    const pagada   = saldoAcumulado <= totalPagado;
    const vencida  = !pagada && venc < hoy;
    return {
      numero:     i + 1,
      vencimiento: venc.toISOString(),
      monto:      valorCuota,
      estado:     pagada ? "PAGADA" : vencida ? "VENCIDA" : "PENDIENTE",
    };
  });
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function PortalClientePage() {
  const params    = useParams();
  const entidadId = params?.entidadId as string;

  // Estado del flujo
  const [paso, setPaso]         = useState<"login" | "dashboard">("login");
  const [dni, setDni]           = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState("");

  // Datos cargados
  const [operaciones, setOperaciones] = useState<any[]>([]);
  const [portal, setPortal]           = useState<any>(null);
  const [opSeleccionada, setOpSel]    = useState<any>(null);

  // UI
  const [expandCuotas,  setExpandCuotas]  = useState(false);
  const [expandPagos,   setExpandPagos]   = useState(false);
  const [descargando,   setDescargando]   = useState(false);

  const color = portal?.colorPrimario || "#FF5E14";

  // Consulta al backend
  const consultar = async () => {
    if (!dni.replace(/\D/g, "")) { setError("Ingresá tu número de DNI"); return; }
    setError(""); setCargando(true);
    try {
      const res  = await fetch("/api/portal/consulta", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidadId, dni: dni.replace(/\D/g, "") }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "No se encontraron operaciones para ese DNI"); return; }
      setOperaciones(data.operaciones);
      setPortal(data.portal);
      setOpSel(data.operaciones[0] || null);
      setPaso("dashboard");
    } catch { setError("Error de conexión. Intentá nuevamente."); }
    finally   { setCargando(false); }
  };

  // Descargar certificado
  const descargarCertificado = async (tipo: string) => {
    if (!opSeleccionada) return;
    setDescargando(true);
    try {
      const res = await fetch("/api/certificados", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacionId:  opSeleccionada.id,
          entidadId,
          tipo,
          emisorNombre: "Portal cliente",
          emisorCargo:  "Autogestión",
          usuarioEmail: "portal",
        }),
      });
      if (!res.ok) { alert("No disponible para este crédito."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `certificado-${tipo.toLowerCase()}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setDescargando(false); }
  };

  const planCuotas = useMemo(() =>
    opSeleccionada ? generarPlanCuotas(opSeleccionada) : [], [opSeleccionada]);

  const cuotasPagadas  = planCuotas.filter(c => c.estado === "PAGADA").length;
  const cuotasVencidas = planCuotas.filter(c => c.estado === "VENCIDA").length;
  const progreso       = planCuotas.length > 0 ? Math.round((cuotasPagadas / planCuotas.length) * 100) : 0;

  const estadoInfo = opSeleccionada ? (ESTADO_INFO[opSeleccionada.estado] || ESTADO_INFO["EN_REVISION"]) : null;

  // ── PANTALLA LOGIN ──────────────────────────────────────────────────────────
  if (paso === "login") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo / nombre */}
        <div className="text-center">
          {portal?.logoUrl
            ? <img src={portal.logoUrl} alt="logo" className="h-12 mx-auto mb-3 object-contain"/>
            : <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-xl font-black"
                style={{ backgroundColor: color }}>P</div>}
          <h1 className="text-xl font-black text-gray-800">{portal?.nombreFantasia || "Portal de Créditos"}</h1>
          <p className="text-sm text-gray-500 mt-1">Consultá el estado de tu crédito</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tu número de DNI</label>
            <input
              type="tel" inputMode="numeric" value={dni}
              onChange={e => setDni(e.target.value)}
              onKeyDown={e => e.key === "Enter" && consultar()}
              placeholder="Ej: 32145678"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-lg font-bold focus:outline-none focus:border-gray-400"/>
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <AlertTriangle size={13}/> {error}
            </p>
          )}

          <button onClick={consultar} disabled={cargando}
            className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: color }}>
            {cargando ? <Loader2 size={18} className="animate-spin"/> : <Search size={18}/>}
            {cargando ? "Buscando..." : "Ver mi crédito"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck size={12}/> Acceso seguro — solo se requiere tu DNI
        </p>
      </div>
    </div>
  );

  // ── DASHBOARD CLIENTE ───────────────────────────────────────────────────────
  if (!opSeleccionada) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {portal?.logoUrl
              ? <img src={portal.logoUrl} alt="logo" className="h-7 object-contain"/>
              : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
                  style={{ backgroundColor: color }}>
                  {portal?.nombreFantasia?.[0]}
                </div>}
            <span className="font-bold text-sm text-gray-800">{portal?.nombreFantasia}</span>
          </div>
          <button onClick={() => { setPaso("login"); setDni(""); setOperaciones([]); }}
            className="text-xs text-gray-400 hover:text-gray-600">
            Salir
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-10">

        {/* Bienvenida */}
        <div>
          <h2 className="text-xl font-black text-gray-800">
            Hola, {opSeleccionada.cliente?.nombre?.split(" ")[0]}
          </h2>
          {portal?.mensajeBienvenida && (
            <p className="text-sm text-gray-500 mt-0.5">{portal.mensajeBienvenida}</p>
          )}
        </div>

        {/* Selector si tiene más de 1 operación */}
        {operaciones.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {operaciones.map((op, i) => (
              <button key={op.id} onClick={() => setOpSel(op)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${opSeleccionada.id === op.id ? "text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}
                style={opSeleccionada.id === op.id ? { backgroundColor: color } : {}}>
                Crédito {i + 1} — {fmt(op.financiero?.montoSolicitado || 0)}
              </button>
            ))}
          </div>
        )}

        {/* Estado del crédito */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Estado del crédito</p>
            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${estadoInfo?.color} ${estadoInfo?.bg}`}>
              {estadoInfo?.icon}{estadoInfo?.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Monto otorgado",  valor: fmt(opSeleccionada.financiero?.montoSolicitado || 0), icon: <DollarSign size={14}/> },
              { label: "Cuota mensual",   valor: fmt(opSeleccionada.financiero?.valorCuota || 0),       icon: <CreditCard size={14}/> },
              { label: "Cuotas",          valor: `${opSeleccionada.financiero?.cuotas || 0}`,            icon: <Calendar size={14}/> },
              { label: "TNA",             valor: `${opSeleccionada.financiero?.tna || 0}%`,              icon: <TrendingUp size={14}/> },
            ].map((k, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">{k.icon}<span className="text-[10px] font-bold uppercase">{k.label}</span></div>
                <p className="font-black text-gray-800 text-base">{k.valor}</p>
              </div>
            ))}
          </div>

          {/* Progreso de cancelación */}
          {opSeleccionada.financiero?.cuotas > 0 && planCuotas.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{cuotasPagadas} de {planCuotas.length} cuotas pagas</span>
                <span>{progreso}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progreso}%`, backgroundColor: color }}/>
              </div>
            </div>
          )}

          {/* Alerta mora */}
          {opSeleccionada.cobranzas?.diasMora > 0 && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5"/>
              <div>
                <p className="text-xs font-bold text-red-600">{opSeleccionada.cobranzas.diasMora} días en mora</p>
                <p className="text-xs text-red-500">Punitorio acumulado: {fmt(opSeleccionada.cobranzas.punitorioAcumulado || 0)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Plan de cuotas */}
        {portal?.mostrarPlanCuotas && planCuotas.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => setExpandCuotas(!expandCuotas)}
              className="w-full flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-gray-400"/>
                <span className="font-bold text-gray-800 text-sm">Plan de cuotas</span>
                {cuotasVencidas > 0 && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    {cuotasVencidas} vencida{cuotasVencidas > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {expandCuotas ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
            </button>

            {expandCuotas && (
              <div className="border-t border-gray-50 divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {planCuotas.map(c => (
                  <div key={c.numero} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        c.estado === "PAGADA"   ? "bg-green-100" :
                        c.estado === "VENCIDA"  ? "bg-red-100"   : "bg-gray-100"}`}>
                        {c.estado === "PAGADA"  && <CheckCircle2 size={10} className="text-green-500"/>}
                        {c.estado === "VENCIDA" && <AlertTriangle size={10} className="text-red-500"/>}
                        {c.estado === "PENDIENTE" && <div className="w-2 h-2 rounded-full bg-gray-300"/>}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">Cuota {c.numero}</p>
                        <p className="text-[10px] text-gray-400">{fmtFecha(c.vencimiento)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-800">{fmt(c.monto)}</p>
                      <p className={`text-[10px] font-bold ${
                        c.estado === "PAGADA"   ? "text-green-500" :
                        c.estado === "VENCIDA"  ? "text-red-500"   : "text-gray-400"}`}>
                        {c.estado === "PAGADA" ? "Pagada" : c.estado === "VENCIDA" ? "Vencida" : "Pendiente"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Historial de pagos */}
        {portal?.mostrarHistorialPagos && opSeleccionada.pagos?.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => setExpandPagos(!expandPagos)}
              className="w-full flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <DollarSign size={15} className="text-gray-400"/>
                <span className="font-bold text-gray-800 text-sm">Historial de pagos</span>
                <span className="text-[10px] text-gray-400">{fmt(opSeleccionada.totalPagado)} total</span>
              </div>
              {expandPagos ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
            </button>

            {expandPagos && (
              <div className="border-t border-gray-50 divide-y divide-gray-50 max-h-56 overflow-y-auto">
                {opSeleccionada.pagos.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-xs font-bold text-gray-700">{fmtFecha(p.fecha)}</p>
                      <p className="text-[10px] text-gray-400">{p.metodo}</p>
                    </div>
                    <p className="text-sm font-black text-green-600">{fmt(p.monto)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Certificados */}
        {portal?.mostrarCertificados && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <FileText size={12}/> Certificados
            </p>
            <div className="space-y-2">
              {opSeleccionada.estado === "FINALIZADO" && (
                <button onClick={() => descargarCertificado("LIBRE_DEUDA")} disabled={descargando}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all">
                  <span className="text-sm font-bold text-gray-700">Libre deuda</span>
                  <Download size={15} className="text-gray-400"/>
                </button>
              )}
              {["LIQUIDADO","APROBADO","EN_MORA"].includes(opSeleccionada.estado) && (
                <button onClick={() => descargarCertificado("ESTADO_VIGENTE")} disabled={descargando}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all">
                  <span className="text-sm font-bold text-gray-700">Estado del crédito</span>
                  <Download size={15} className="text-gray-400"/>
                </button>
              )}
              {["LIQUIDADO","FINALIZADO"].includes(opSeleccionada.estado) && (
                <button onClick={() => descargarCertificado("CUOTAS_AL_DIA")} disabled={descargando}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all">
                  <span className="text-sm font-bold text-gray-700">Cuotas al día</span>
                  <Download size={15} className="text-gray-400"/>
                </button>
              )}
              {!["LIQUIDADO","APROBADO","EN_MORA","FINALIZADO"].includes(opSeleccionada.estado) && (
                <p className="text-xs text-gray-400 text-center py-2">
                  No hay certificados disponibles para el estado actual
                </p>
              )}
            </div>
          </div>
        )}

        {/* Contacto asesor */}
        {portal?.mostrarContactoAsesor && opSeleccionada.vendedorTel && (
          <a href={`https://wa.me/${opSeleccionada.vendedorTel.replace(/\D/g, "")}?text=Hola, soy ${opSeleccionada.cliente?.nombre} y consulto sobre mi crédito ${opSeleccionada.id?.slice(0,8).toUpperCase()}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-green-500 text-white font-black text-sm">
            <MessageSquare size={16}/>
            Consultar a mi asesor por WhatsApp
          </a>
        )}

        <p className="text-center text-[10px] text-gray-300 flex items-center justify-center gap-1 pt-2">
          <ShieldCheck size={10}/> Powered by Paysur Finanzas
        </p>
      </div>
    </div>
  );
}
