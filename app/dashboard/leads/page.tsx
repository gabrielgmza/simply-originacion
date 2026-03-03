"use client";
// app/dashboard/leads/page.tsx
// Panel de gestión de leads capturados desde el simulador público
import { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, getDocs, doc,
  updateDoc, serverTimestamp, addDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Users, Search, Filter, ChevronRight, Loader2,
  Phone, Mail, CheckCircle2, XCircle, Clock,
  ArrowRight, MessageSquare, UserCheck, RefreshCw
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type EstadoLead = "NUEVO" | "CONTACTADO" | "EN_PROCESO" | "CONVERTIDO" | "DESCARTADO";

const ESTADOS: { key: EstadoLead; label: string; color: string; bg: string }[] = [
  { key: "NUEVO",       label: "Nuevo",       color: "#60a5fa", bg: "#0a1628" },
  { key: "CONTACTADO",  label: "Contactado",  color: "#facc15", bg: "#1a1400" },
  { key: "EN_PROCESO",  label: "En proceso",  color: "#fb923c", bg: "#1a0d00" },
  { key: "CONVERTIDO",  label: "Convertido",  color: "#4ade80", bg: "#0a1f0a" },
  { key: "DESCARTADO",  label: "Descartado",  color: "#6b7280", bg: "#111"    },
];

const SCORING_COLOR: Record<string, string> = {
  APROBADO:  "#4ade80",
  OBSERVADO: "#facc15",
  RECHAZADO: "#f87171",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// ── Componente ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const { entidadData, userData } = useAuth();
  const router  = useRouter();
  const color   = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const [leads,      setLeads]      = useState<any[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [busqueda,   setBusqueda]   = useState("");
  const [filtroEst,  setFiltroEst]  = useState<EstadoLead | "TODOS">("TODOS");
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [nota,       setNota]       = useState("");
  const [guardando,  setGuardando]  = useState(false);

  const cargar = async () => {
    if (!entidadData?.id) return;
    setCargando(true);
    const snap = await getDocs(
      query(collection(db, "leads"), where("entidadId", "==", entidadData.id))
    );
    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() as any }))
      .sort((a, b) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
    setLeads(data);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [entidadData]);

  // KPIs
  const kpis = useMemo(() => ({
    total:      leads.length,
    nuevos:     leads.filter(l => l.estado === "NUEVO").length,
    convertidos:leads.filter(l => l.estado === "CONVERTIDO").length,
    aprobados:  leads.filter(l => l.scoring?.resultado === "APROBADO").length,
  }), [leads]);

  // Filtros
  const leadsFiltrados = useMemo(() => {
    let r = leads;
    if (filtroEst !== "TODOS") r = r.filter(l => l.estado === filtroEst);
    if (busqueda) {
      const b = busqueda.toLowerCase();
      r = r.filter(l =>
        l.nombre?.toLowerCase().includes(b) ||
        l.dni?.includes(b) ||
        l.telefono?.includes(b)
      );
    }
    return r;
  }, [leads, filtroEst, busqueda]);

  // Cambiar estado del lead
  const cambiarEstado = async (leadId: string, nuevoEstado: EstadoLead) => {
    await updateDoc(doc(db, "leads", leadId), {
      estado: nuevoEstado,
      fechaActualizacion: serverTimestamp(),
      ...(nuevoEstado === "CONTACTADO" ? { fechaPrimerContacto: serverTimestamp() } : {}),
    });
    setLeads(p => p.map(l => l.id === leadId ? { ...l, estado: nuevoEstado } : l));
    if (seleccionado?.id === leadId) setSeleccionado((p: any) => ({ ...p, estado: nuevoEstado }));
  };

  // Registrar nota de gestión
  const registrarNota = async () => {
    if (!nota.trim() || !seleccionado) return;
    setGuardando(true);
    try {
      await addDoc(collection(db, "logs_leads"), {
        leadId:   seleccionado.id,
        entidadId:entidadData?.id,
        nota,
        usuario:  userData?.email,
        fecha:    serverTimestamp(),
      });
      await updateDoc(doc(db, "leads", seleccionado.id), {
        ultimaNota: nota,
        fechaActualizacion: serverTimestamp(),
      });
      setNota("");
      setLeads(p => p.map(l => l.id === seleccionado.id ? { ...l, ultimaNota: nota } : l));
    } finally { setGuardando(false); }
  };

  // Convertir lead → originación
  const convertir = async () => {
    if (!seleccionado) return;
    await cambiarEstado(seleccionado.id, "CONVERTIDO");
    router.push(`/dashboard/originacion?leadId=${seleccionado.id}`);
  };

  // Enviar WhatsApp al lead
  const enviarWS = async () => {
    if (!seleccionado?.telefono) return;
    const tel = seleccionado.telefono.replace(/\D/g, "");
    const monto = seleccionado.simulacion?.monto || 0;
    const cuota = seleccionado.simulacion?.cuotaEstimada || 0;
    const msg = encodeURIComponent(
      `Hola ${seleccionado.nombre?.split(" ")[0] || ""}! 👋\n\n` +
      `Te contactamos de *${entidadData?.nombreFantasia || "nuestra empresa"}* ` +
      `en relación a tu simulación de crédito por *${fmt(monto)}*.\n\n` +
      `¿Cuándo tenés disponibilidad para hablar? 😊`
    );
    window.open(`https://wa.me/549${tel}?text=${msg}`, "_blank");
    if (seleccionado.estado === "NUEVO") await cambiarEstado(seleccionado.id, "CONTACTADO");
  };

  const estadoSelec = ESTADOS.find(e => e.key === seleccionado?.estado);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col" style={{ maxWidth: "100%" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-900">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Users size={18} style={{ color }}/> Leads
          </h1>
          <p className="text-gray-600 text-xs mt-0.5">{leads.length} captados desde el simulador</p>
        </div>
        <button onClick={cargar} className="text-gray-600 hover:text-white transition-colors">
          <RefreshCw size={15}/>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-gray-900">
        {[
          { label: "Total",       valor: kpis.total,       c: "#fff"     },
          { label: "Nuevos",      valor: kpis.nuevos,      c: "#60a5fa"  },
          { label: "Convertidos", valor: kpis.convertidos, c: "#4ade80"  },
          { label: "Pre-aprobados", valor: kpis.aprobados, c: "#4ade80"  },
        ].map((k, i) => (
          <div key={i} className="bg-[#0A0A0A] border border-gray-900 rounded-xl p-3 text-center">
            <p className="font-black text-lg" style={{ color: k.c }}>{k.valor}</p>
            <p className="text-gray-600 text-[10px] uppercase font-bold">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Layout: lista + detalle */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LISTA ─────────────────────────────────────────────────────── */}
        <div className="w-80 border-r border-gray-900 flex flex-col">

          {/* Filtros */}
          <div className="p-3 space-y-2 border-b border-gray-900">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar nombre, DNI, tel…"
                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white outline-none"/>
            </div>
            <div className="flex gap-1 flex-wrap">
              {[{ key:"TODOS", label:"Todos" }, ...ESTADOS.map(e => ({ key: e.key, label: e.label }))].map(e => (
                <button key={e.key} onClick={() => setFiltroEst(e.key as any)}
                  className="px-2 py-1 rounded-md text-[10px] font-bold transition-all"
                  style={{
                    background: filtroEst === e.key ? color : "#111",
                    color:      filtroEst === e.key ? "#fff" : "#666",
                  }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-900">
            {cargando ? (
              <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-gray-600"/></div>
            ) : leadsFiltrados.length === 0 ? (
              <p className="text-center py-10 text-gray-600 text-xs">Sin resultados</p>
            ) : leadsFiltrados.map(lead => {
              const est = ESTADOS.find(e => e.key === lead.estado) || ESTADOS[0];
              return (
                <div key={lead.id} onClick={() => setSeleccionado(lead)}
                  className="p-3 cursor-pointer hover:bg-white/5 transition-all"
                  style={{ background: seleccionado?.id === lead.id ? "#111" : "" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white truncate">{lead.nombre}</p>
                      <p className="text-[10px] text-gray-500">DNI {lead.dni} · {lead.telefono}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: est.bg, color: est.color }}>{est.label}</span>
                      {lead.scoring?.resultado && (
                        <span className="text-[9px] font-bold"
                          style={{ color: SCORING_COLOR[lead.scoring.resultado] }}>
                          {lead.scoring.resultado}
                        </span>
                      )}
                    </div>
                  </div>
                  {lead.simulacion?.monto && (
                    <p className="text-xs text-gray-500 mt-1">
                      {fmt(lead.simulacion.monto)} · {lead.simulacion.cuotas}c
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DETALLE ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {!seleccionado ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <Users size={32} className="text-gray-800"/>
              <p className="text-gray-600 text-sm">Seleccioná un lead para ver el detalle</p>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-5">

              {/* Header detalle */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">{seleccionado.nombre}</h2>
                  <p className="text-gray-500 text-sm">DNI {seleccionado.dni} · CUIL {seleccionado.cuil}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: estadoSelec?.bg, color: estadoSelec?.color }}>
                  {estadoSelec?.label}
                </span>
              </div>

              {/* Datos de contacto */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 space-y-2">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Contacto</p>
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={13} className="text-gray-500"/>
                  <span className="text-white">{seleccionado.telefono}</span>
                </div>
                {seleccionado.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={13} className="text-gray-500"/>
                    <span className="text-white">{seleccionado.email}</span>
                  </div>
                )}
              </div>

              {/* Simulación */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Simulación</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l:"Monto",    v: fmt(seleccionado.simulacion?.monto || 0)          },
                    { l:"Cuotas",   v: `${seleccionado.simulacion?.cuotas || "—"}`        },
                    { l:"Cuota est.",v: fmt(seleccionado.simulacion?.cuotaEstimada || 0)  },
                  ].map((k, i) => (
                    <div key={i} className="bg-gray-900/40 rounded-xl p-3 text-center">
                      <p className="font-black text-white text-base">{k.v}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{k.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* BCRA + Scoring */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Perfil crediticio</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-900/40 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Situación BCRA</p>
                    <p className="font-black text-white text-xl">{seleccionado.bcra?.situacion || 1}</p>
                  </div>
                  <div className="flex-1 bg-gray-900/40 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Pre-aprobación</p>
                    <p className="font-black text-lg"
                      style={{ color: SCORING_COLOR[seleccionado.scoring?.resultado] || "#fff" }}>
                      {seleccionado.scoring?.resultado || "—"}
                    </p>
                  </div>
                  <div className="flex-1 bg-gray-900/40 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Score</p>
                    <p className="font-black text-white text-xl">{seleccionado.scoring?.puntaje || "—"}</p>
                  </div>
                </div>
                {seleccionado.bcra?.tieneDeudas && (
                  <p className="text-xs text-yellow-500">⚠️ Registra deudas en BCRA</p>
                )}
              </div>

              {/* Cambiar estado */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Estado del lead</p>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS.filter(e => e.key !== "CONVERTIDO").map(e => (
                    <button key={e.key} onClick={() => cambiarEstado(seleccionado.id, e.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: seleccionado.estado === e.key ? e.bg : "#111",
                        color:      seleccionado.estado === e.key ? e.color : "#666",
                        border:    `1px solid ${seleccionado.estado === e.key ? e.color + "44" : "#1f2023"}`,
                      }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nota de gestión */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Nota de gestión</p>
                {seleccionado.ultimaNota && (
                  <div className="p-3 rounded-xl bg-gray-900/40 text-xs text-gray-400 border border-gray-800">
                    {seleccionado.ultimaNota}
                  </div>
                )}
                <textarea value={nota} onChange={e => setNota(e.target.value)}
                  placeholder="Registrá una acción, promesa o comentario…"
                  rows={3}
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none resize-none focus:border-gray-600"/>
                <button onClick={registrarNota} disabled={!nota.trim() || guardando}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all hover:brightness-110"
                  style={{ background: color }}>
                  {guardando ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>}
                  Guardar nota
                </button>
              </div>

              {/* Acciones rápidas */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={enviarWS}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-700 text-sm font-bold text-gray-300 hover:text-white hover:border-gray-500 transition-all">
                  <MessageSquare size={14}/> WhatsApp
                </button>
                {seleccionado.scoring?.resultado !== "RECHAZADO" && seleccionado.estado !== "CONVERTIDO" && (
                  <button onClick={convertir}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-all hover:brightness-110"
                    style={{ background: color }}>
                    <UserCheck size={14}/> Convertir a operación
                  </button>
                )}
                {seleccionado.estado === "CONVERTIDO" && (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-green-400 border border-green-900/40 bg-green-900/10">
                    <CheckCircle2 size={14}/> Ya convertido
                  </div>
                )}
              </div>

              {/* Fecha */}
              <p className="text-xs text-gray-700 text-center">
                Lead recibido: {seleccionado.fechaCreacion?.toDate?.()?.toLocaleDateString("es-AR") || "—"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
