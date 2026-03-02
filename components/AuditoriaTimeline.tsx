"use client";
import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EVENTO_LABELS, EVENTO_COLORS } from "@/lib/auditoria/logger";
import { Loader2, Clock } from "lucide-react";

interface Evento {
  id: string;
  accion: string;
  detalles?: string;
  usuario?: string;
  usuarioNombre?: string;
  fecha?: any;
}

interface Props {
  operacionId: string;
}

export default function AuditoriaTimeline({ operacionId }: Props) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!operacionId) return;

    const q = query(
      collection(db, "logs_operaciones"),
      where("operacionId", "==", operacionId),
      orderBy("fecha", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Evento)));
      setLoading(false);
    });

    return () => unsub();
  }, [operacionId]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="animate-spin text-gray-600" size={24} />
    </div>
  );

  if (eventos.length === 0) return (
    <div className="text-center py-8 text-gray-600 text-sm">
      <Clock size={28} className="mx-auto mb-2 opacity-30" />
      Sin eventos registrados todavía.
    </div>
  );

  return (
    <div className="space-y-0">
      {eventos.map((ev, i) => {
        const color = EVENTO_COLORS[ev.accion] || "#6b7280";
        const label = EVENTO_LABELS[ev.accion] || ev.accion;
        const fecha = ev.fecha?.toDate?.();
        const fechaStr = fecha
          ? fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
          : "—";
        const horaStr = fecha
          ? fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
          : "";
        const esUltimo = i === eventos.length - 1;

        return (
          <div key={ev.id} className="flex gap-4">
            {/* Línea de tiempo */}
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full mt-1 shrink-0 ring-2 ring-black"
                style={{ backgroundColor: color }} />
              {!esUltimo && <div className="w-px flex-1 bg-gray-800 my-1" />}
            </div>

            {/* Contenido */}
            <div className={`pb-5 flex-1 ${esUltimo ? "" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-white">{label}</p>
                <span className="text-[10px] text-gray-600 shrink-0 text-right">
                  {fechaStr}<br />{horaStr}
                </span>
              </div>
              {ev.detalles && (
                <p className="text-xs text-gray-500 mt-0.5">{ev.detalles}</p>
              )}
              <p className="text-[11px] text-gray-600 mt-1">
                por {ev.usuarioNombre || ev.usuario || "Sistema"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
