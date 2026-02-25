"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Search, Download, Eye, Loader2, Building2, Clock, CheckCircle, AlertTriangle, FileText } from "lucide-react";

export default function OperacionesPage() {
  const { userData, entidadData } = useAuth();
  const router = useRouter();
  const [operaciones, setOperaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const cargarOperaciones = async () => {
      if (!userData?.entidadId) return;
      setCargando(true);
      try {
        const q = query(collection(db, "operaciones"), where("entidadId", "==", userData.entidadId));
        const querySnapshot = await getDocs(q);
        
        let data: any[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });

        if (userData.rol === "VENDEDOR") {
          data = data.filter(op => op.vendedorId === userData.uid);
        }

        data.sort((a, b) => {
          const timeA = a.fechaCreacion?.seconds || 0;
          const timeB = b.fechaCreacion?.seconds || 0;
          return timeB - timeA;
        });

        setOperaciones(data);
      } catch (error) {
        console.error("Error al cargar operaciones:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarOperaciones();
  }, [userData]);

  const operacionesFiltradas = operaciones.filter(op => 
    op.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    op.cliente.dni.includes(busqueda)
  );

  const exportarCSV = () => {
    if (operacionesFiltradas.length === 0) return;
    
    const cabeceras = ["Fecha", "Cliente", "DNI/CUIL", "Tipo Credito", "Monto", "Cuotas", "Estado"];
    const filas = operacionesFiltradas.map(op => [
      new Date(op.fechaCreacion?.seconds * 1000).toLocaleDateString('es-AR'),
      op.cliente.nombre,
      op.cliente.cuil || op.cliente.dni,
      op.tipo,
      op.financiero.montoSolicitado,
      op.financiero.cuotas,
      op.estado
    ]);
    
    const contenidoCSV = [cabeceras.join(","), ...filas.map(f => f.join(","))].join("\n");
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `operaciones_${entidadData?.nombreFantasia || 'entidad'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);
  };

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const renderEstado = (estado: string) => {
    switch(estado) {
      case "PENDIENTE_DOCS": return <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-950/30 text-yellow-500 border border-yellow-900/50 rounded-full text-xs font-medium"><Clock size={12}/> Pendiente Docs</span>;
      case "EN_REVISION": return <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-950/30 text-blue-500 border border-blue-900/50 rounded-full text-xs font-medium"><Eye size={12}/> En Revision</span>;
      case "LIQUIDADO": return <span className="flex items-center gap-1 px-2.5 py-1 bg-green-950/30 text-green-500 border border-green-900/50 rounded-full text-xs font-medium"><CheckCircle size={12}/> Liquidado</span>;
      case "RECHAZADO": return <span className="flex items-center gap-1 px-2.5 py-1 bg-red-950/30 text-red-500 border border-red-900/50 rounded-full text-xs font-medium"><AlertTriangle size={12}/> Rechazado</span>;
      default: return <span className="px-2.5 py-1 bg-gray-800 text-gray-400 rounded-full text-xs font-medium">{estado}</span>;
    }
  };

  if (cargando) return <div className="p-8 flex justify-center mt-20"><Loader2 className="animate-spin text-gray-500" size={40} /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Building2 style={{ color: colorPrimario }} /> Cartera de Activos
          </h1>
          <p className="text-gray-400">Registro maestro de operaciones generadas.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Buscar DNI o Nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#111] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-gray-500 transition-colors"
            />
          </div>
          <button 
            onClick={exportarCSV}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-gray-800"
          >
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#111] border-b border-gray-800">
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Titular</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Linea / Tipo</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Monto Solicitado</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {operacionesFiltradas.map((op) => (
                <tr key={op.id} className="hover:bg-gray-900/50 transition-colors group">
                  <td className="p-4 text-sm text-gray-300">
                    {op.fechaCreacion ? new Date(op.fechaCreacion.seconds * 1000).toLocaleDateString('es-AR') : 'N/A'}
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-white text-sm">{op.cliente.nombre}</p>
                    <p className="text-xs text-gray-500">CUIL: {op.cliente.cuil || op.cliente.dni}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-medium text-gray-300 bg-gray-800 px-2 py-1 rounded">
                      {op.tipo}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{op.financiero.cuotas} Cuotas</p>
                  </td>
                  <td className="p-4 text-right">
                    <p className="font-bold text-white text-sm">{formatearMoneda(op.financiero.montoSolicitado)}</p>
                  </td>
                  <td className="p-4">
                    {renderEstado(op.estado)}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => router.push(`/dashboard/operaciones/${op.id}`)}
                      className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800 inline-flex" 
                      title="Ver Legajo"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {operacionesFiltradas.length === 0 && (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center">
            <FileText size={48} className="mb-4 text-gray-700" />
            <p className="text-lg font-medium">No se encontraron operaciones.</p>
            <p className="text-sm mt-1">Genera un nuevo legajo desde el Originador.</p>
          </div>
        )}
      </div>
    </div>
  );
}
