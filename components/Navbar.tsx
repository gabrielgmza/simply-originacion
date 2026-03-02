"use client";
import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, onSnapshot,
  orderBy, limit, updateDoc, doc, writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import { NOTIF_CONFIG, TipoNotificacion } from "@/lib/notificaciones/internas";

interface Notif {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion: string;
  leida: boolean;
  fecha?: any;
  operacionId?: string;
  linkDestino?: string;
  clienteNombre?: string;
}

export default function Navbar() {
  const { entidadData, userData } = useAuth();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const sinLeer = notifs.filter(n => !n.leida).length;

  // ── Escuchar notificaciones en tiempo real ──
  useEffect(() => {
    if (!entidadData?.id || !userData?.rol) return;

    const q = query(
      collection(db, "notificaciones"),
      where("entidadId", "==", entidadData.id),
      where("rolesDestino", "array-contains", userData.rol),
      orderBy("fecha", "desc"),
      limit(30)
    );

    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notif)));
    });

    return () => unsub();
  }, [entidadData, userData]);

  // ── Cerrar al hacer click afuera ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Marcar una como leída ──
  const marcarLeida = async (n: Notif) => {
    if (!n.leida) {
      await updateDoc(doc(db, "notificaciones", n.id), { leida: true });
    }
    if (n.linkDestino) {
      setOpen(false);
      router.push(n.linkDestino);
    }
  };

  // ── Marcar todas como leídas ──
  const marcarTodas = async () => {
    const sinLeerList = notifs.filter(n => !n.leida);
    if (!sinLeerList.length) return;
    setMarcando(true);
    try {
      const batch = writeBatch(db);
      sinLeerList.forEach(n => batch.update(doc(db, "notificaciones", n.id), { leida: true }));
      await batch.commit();
    } catch (e) { console.error(e); }
    finally { setMarcando(false); }
  };

  const formatFecha = (fecha: any) => {
    if (!fecha) return "";
    const d = fecha?.toDate?.() || new Date(fecha);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1)   return "Ahora";
    if (diff < 60)  return `Hace ${diff}m`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString("es-AR");
  };

  return (
    <div className="h-14 border-b border-gray-900 bg-[#050505] flex items-center justify-end px-6 sticky top-0 z-50">
      <div className="relative" ref={dropRef}>

        {/* CAMPANA */}
        <button onClick={() => setOpen(!open)}
          className="relative p-2 rounded-xl hover:bg-gray-900 transition-all group">
          <Bell size={20} className="text-gray-400 group-hover:text-white transition-colors" />
          {sinLeer > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center"
              style={{ backgroundColor: colorPrimario }}>
              {sinLeer > 9 ? "9+" : sinLeer}
            </span>
          )}
        </button>

        {/* DROPDOWN */}
        {open && (
          <div className="absolute right-0 mt-2 w-96 bg-[#0A0A0A] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-[#0D0D0D]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Notificaciones</span>
                {sinLeer > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: colorPrimario }}>
                    {sinLeer}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {sinLeer > 0 && (
                  <button onClick={marcarTodas} disabled={marcando}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                    {marcando ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                    Marcar todas
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X size={16} className="text-gray-500 hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-900">
              {notifs.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={28} className="mx-auto text-gray-800 mb-2" />
                  <p className="text-xs text-gray-600">Sin notificaciones</p>
                </div>
              ) : notifs.map(n => {
                const cfg = NOTIF_CONFIG[n.tipo] || { color: "#6b7280", emoji: "🔔" };
                return (
                  <div key={n.id} onClick={() => marcarLeida(n)}
                    className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.03] ${!n.leida ? "bg-white/[0.02]" : ""}`}>

                    {/* Dot sin leer */}
                    <div className="mt-1 shrink-0">
                      {!n.leida
                        ? <span className="block w-2 h-2 rounded-full mt-1" style={{ backgroundColor: cfg.color }} />
                        : <span className="block w-2 h-2 rounded-full mt-1 bg-transparent" />
                      }
                    </div>

                    {/* Emoji */}
                    <div className="text-lg shrink-0 leading-none mt-0.5">{cfg.emoji}</div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.leida ? "font-bold text-white" : "font-medium text-gray-300"}`}>
                        {n.titulo}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{n.descripcion}</p>
                      <p className="text-[10px] mt-1" style={{ color: cfg.color }}>
                        {formatFecha(n.fecha)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-800 bg-[#0D0D0D]">
              <button onClick={() => { setOpen(false); router.push("/dashboard/notificaciones"); }}
                className="text-xs font-bold w-full text-center hover:underline"
                style={{ color: colorPrimario }}>
                Ver historial completo →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
