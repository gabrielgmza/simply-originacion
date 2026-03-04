"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Key, Plus, Trash2, ShieldAlert, Loader2, EyeOff, CheckCircle, Users, X } from "lucide-react";

export default function CredencialesPage() {
  const { userData, entidadData } = useAuth();
  const [credenciales, setCredenciales]   = useState<any[]>([]);
  const [vendedores,   setVendedores]     = useState<any[]>([]);
  const [cargando,     setCargando]       = useState(true);
  const [procesando,   setProcesando]     = useState(false);
  const [mostrarModal, setMostrarModal]   = useState(false);
  const [modalAsignar, setModalAsignar]   = useState<any>(null); // credencial a asignar
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const [nuevaCredencial, setNuevaCredencial] = useState({
    usuarioGobierno: "", passwordGobierno: "", etiqueta: ""
  });

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  const cargarDatos = async () => {
    if (!entidadData?.id) return;
    setCargando(true);
    try {
      const [snapCreds, snapVendedores] = await Promise.all([
        getDocs(query(collection(db, "credencialesCuad"), where("entidadId", "==", entidadData.id))),
        getDocs(query(collection(db, "usuarios"), where("entidadId", "==", entidadData.id))),
      ]);
      setCredenciales(snapCreds.docs.map(d => ({ id: d.id, ...d.data() })));
      setVendedores(snapVendedores.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => ["VENDEDOR","SUPERVISOR","GERENTE","GERENTE_GENERAL"].includes(u.rol)));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [entidadData]);

  const guardarCredencial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadData?.id) return;
    setProcesando(true);
    try {
      await addDoc(collection(db, "credencialesCuad"), {
        entidadId: entidadData.id,
        usuarioGobierno: nuevaCredencial.usuarioGobierno,
        passwordGobierno: nuevaCredencial.passwordGobierno,
        etiqueta: nuevaCredencial.etiqueta,
        activa: true,
        vendedoresAsignados: [],
        fechaCreacion: serverTimestamp(),
      });
      setMostrarModal(false);
      setNuevaCredencial({ usuarioGobierno: "", passwordGobierno: "", etiqueta: "" });
      cargarDatos();
    } finally { setProcesando(false); }
  };

  const eliminarCredencial = async (id: string) => {
    if (!confirm("¿Eliminar esta credencial? El bot dejará de utilizarla.")) return;
    setCargando(true);
    await deleteDoc(doc(db, "credencialesCuad", id));
    cargarDatos();
  };

  const abrirAsignar = (cred: any) => {
    setModalAsignar(cred);
    setSeleccionados(cred.vendedoresAsignados || []);
  };

  const guardarAsignacion = async () => {
    if (!modalAsignar) return;
    setProcesando(true);
    try {
      await updateDoc(doc(db, "credencialesCuad", modalAsignar.id), {
        vendedoresAsignados: seleccionados,
      });
      setModalAsignar(null);
      cargarDatos();
    } finally { setProcesando(false); }
  };

  const toggleVendedor = (uid: string) =>
    setSeleccionados(p => p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid]);

  if (!userData?.rol.includes("GERENTE")) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center">
        <ShieldAlert size={48} className="mb-4 text-red-500"/>
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p>Solo gerencia puede gestionar el pool de cuentas de gobierno.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto text-[#F8F9FA]">
      <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Key style={{ color: colorPrimario }}/> Pool de Credenciales CUAD
          </h1>
          <p className="text-gray-400 mt-1">Cuentas oficiales del Gobierno de Mendoza. Asigná cada una a sus vendedores.</p>
        </div>
        <button onClick={() => setMostrarModal(true)}
          className="text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: colorPrimario }}>
          <Plus size={18}/> Agregar Credencial
        </button>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 bg-[#111] border-b border-gray-800 flex items-center gap-3 text-sm text-gray-400">
          <ShieldAlert size={16} className="text-yellow-500"/>
          <p>Cada credencial puede asignarse a uno o más vendedores. El legajo usará automáticamente la credencial del vendedor activo.</p>
        </div>

        {cargando ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" size={40}/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#111] border-b border-gray-800">
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Etiqueta</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuario</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contraseña</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vendedores asignados</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {credenciales.map(cred => {
                  const asignados = vendedores.filter(v => (cred.vendedoresAsignados || []).includes(v.id));
                  return (
                    <tr key={cred.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white text-sm">{cred.etiqueta || "Sin etiqueta"}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-gray-300 text-sm bg-gray-900 px-2 py-1 rounded border border-gray-800">
                          {cred.usuarioGobierno}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-gray-500">
                          <EyeOff size={16}/>
                          <span className="font-mono tracking-widest text-lg leading-none">••••••••</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {asignados.length === 0 ? (
                          <span className="text-xs text-gray-600 italic">Sin asignar</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {asignados.map(v => (
                              <span key={v.id} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">
                                {v.nombre || v.email}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => abrirAsignar(cred)}
                            className="p-2 bg-blue-950/30 hover:bg-blue-900/50 text-blue-400 border border-blue-900/50 rounded-lg transition-colors"
                            title="Asignar vendedores">
                            <Users size={16}/>
                          </button>
                          <button onClick={() => eliminarCredencial(cred.id)}
                            className="p-2 bg-red-950/30 hover:bg-red-900 text-red-500 hover:text-white border border-red-900/50 rounded-lg transition-colors"
                            title="Eliminar">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {credenciales.length === 0 && (
              <div className="p-16 text-center text-gray-500">
                <Key size={48} className="mx-auto text-gray-700 mb-4"/>
                <p className="text-lg font-medium text-gray-300">El pool está vacío.</p>
                <p className="text-sm mt-1">Agregá tu primer usuario gubernamental para habilitar el motor CUAD.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal nueva credencial */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <Key style={{ color: colorPrimario }}/> Nueva Credencial
            </h3>
            <form onSubmit={guardarCredencial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Etiqueta (opcional)</label>
                <input type="text" placeholder="Ej: Sucursal Centro"
                  value={nuevaCredencial.etiqueta}
                  onChange={e => setNuevaCredencial({...nuevaCredencial, etiqueta: e.target.value})}
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:border-gray-500 outline-none"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Usuario Portal Gobierno</label>
                <input type="text" required placeholder="Usuario asignado"
                  value={nuevaCredencial.usuarioGobierno}
                  onChange={e => setNuevaCredencial({...nuevaCredencial, usuarioGobierno: e.target.value})}
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-gray-500 outline-none"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña</label>
                <input type="password" required placeholder="••••••••"
                  value={nuevaCredencial.passwordGobierno}
                  onChange={e => setNuevaCredencial({...nuevaCredencial, passwordGobierno: e.target.value})}
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-gray-500 outline-none"/>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setMostrarModal(false)}
                  className="flex-1 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">Cancelar</button>
                <button type="submit" disabled={procesando}
                  className="flex-1 py-3 text-white rounded-lg font-bold disabled:opacity-50 flex justify-center items-center"
                  style={{ backgroundColor: colorPrimario }}>
                  {procesando ? <Loader2 className="animate-spin" size={20}/> : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal asignar vendedores */}
      {modalAsignar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-white">Asignar vendedores</h3>
                <p className="text-xs text-gray-500 mt-0.5">Credencial: <span className="text-gray-300 font-mono">{modalAsignar.usuarioGobierno}</span></p>
              </div>
              <button onClick={() => setModalAsignar(null)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {vendedores.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No hay vendedores cargados en la entidad</p>
              )}
              {vendedores.map(v => (
                <button key={v.id} onClick={() => toggleVendedor(v.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    seleccionados.includes(v.id)
                      ? "bg-green-900/20 border-green-900/50 text-green-400"
                      : "bg-black border-gray-800 text-gray-400 hover:border-gray-600"}`}>
                  <div>
                    <p className="font-bold text-sm">{v.nombre || v.email}</p>
                    <p className="text-[10px] opacity-60">{v.rol?.replace(/_/g," ")} · {v.email}</p>
                  </div>
                  {seleccionados.includes(v.id) && <CheckCircle size={15}/>}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-5 pt-4 border-t border-gray-800">
              <button onClick={() => setModalAsignar(null)}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">Cancelar</button>
              <button onClick={guardarAsignacion} disabled={procesando}
                className="flex-1 py-3 text-white rounded-xl font-black disabled:opacity-50 flex justify-center items-center"
                style={{ backgroundColor: colorPrimario }}>
                {procesando ? <Loader2 size={16} className="animate-spin"/> : "Guardar asignación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
