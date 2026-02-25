"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, FileText, ShieldCheck, Gavel } from "lucide-react";

export default function DetalleLegajo() {
  const { id } = useParams();
  const [op, setOp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "operaciones", id as string));
      if (snap.exists()) setOp({ id: snap.id, ...snap.data() });
    };
    load();
  }, [id]);

  const liquidar = async () => {
    setLoading(true);
    await updateDoc(doc(db, "operaciones", id as string), { 
      estado: "LIQUIDADO", 
      fechaLiquidacion: serverTimestamp() 
    });
    setLoading(false);
    router.push("/dashboard/cartera");
  };

  if (!op) return <div className="p-20 text-center text-white">Cargando expediente...</div>;

  return (
    <div className="p-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 mb-8"><ArrowLeft size={16}/> Volver</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <h2 className="text-2xl font-black text-white mb-4">{op.cliente?.nombre}</h2>
          <div className="pt-6 border-t border-gray-900 space-y-4">
            <p className="text-gray-400">DNI: <span className="text-white">{op.cliente?.dni}</span></p>
            <p className="text-gray-400">Capital: <span className="text-white">${op.financiero?.montoSolicitado}</span></p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] flex flex-col justify-between">
          <div>
            <h3 className="text-black font-black text-xl flex items-center gap-2"><ShieldCheck/> Resolución</h3>
            <p className="text-gray-500 text-sm mt-2">Aplica punitorio 0.12% diario en caso de mora.</p>
          </div>
          <button onClick={liquidar} disabled={loading} className="w-full bg-black text-white py-4 rounded-2xl font-bold mt-8">
            {loading ? "Procesando..." : "Aprobar y Liquidar"}
          </button>
        </div>
      </div>
    </div>
  );
}
