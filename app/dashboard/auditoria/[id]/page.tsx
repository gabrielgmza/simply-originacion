"use client";
import { use, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AuditoriaTimeline from "@/components/AuditoriaTimeline";
import { registrarEvento } from "@/lib/auditoria/logger";
import { Loader2, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

export default function AuditoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { userData, entidadData } = useAuth();
  const [operacion, setOperacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  useEffect(() => {
    const cargar = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "operaciones", id));
      if (snap.exists()) {
        setOperacion({ id: snap.id, ...snap.data() });
        // Registrar que este usuario vio el legajo
        if (userData?.email && entidadData?.id) {
          await registrarEvento({
            operacionId: id,
            entidadId: entidadData.id,
            usuarioEmail: userData.email,
            usuarioNombre: userData.nombre || userData.email,
            accion: "LEGAJO_VISTO",
            detalles: `Historial consultado desde el panel`,
          });
        }
      }
      setLoading(false);
    };
    cargar();
  }, [id, userData, entidadData]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-gray-500" size={32} />
    </div>
  );

  if (!operacion) return (
    <div className="text-center py-20 text-gray-600">Operación no encontrada.</div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/cartera/${id}`}
          className="p-2 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white italic tracking-tight uppercase flex items-center gap-2">
            <Shield size={20} style={{ color: colorPrimario }} /> Auditoría
          </h1>
          <p className="text-gray-500 text-sm">
            {operacion.cliente?.nombre || "—"} · DNI {operacion.cliente?.dni}
          </p>
        </div>
      </div>

      {/* RESUMEN OPERACIÓN */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-5 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Monto</p>
          <p className="font-black text-white">${(operacion.financiero?.montoSolicitado || 0).toLocaleString("es-AR")}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Estado</p>
          <p className="font-bold text-white text-sm">{operacion.estado}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">ID</p>
          <p className="font-mono text-gray-400 text-xs">{id.slice(0, 12)}…</p>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-5">
          Historial de eventos
        </p>
        <AuditoriaTimeline operacionId={id} />
      </div>

    </div>
  );
}
