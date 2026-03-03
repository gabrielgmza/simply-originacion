"use client";
import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs, addDoc,
  doc, updateDoc, deleteDoc, serverTimestamp, getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Building2, Plus, Pencil, Trash2, Users,
  DollarSign, FileText, MapPin, Phone, Save,
  Loader2, CheckCircle2, X, ChevronRight
} from "lucide-react";

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  activa: boolean;
  entidadId: string;
  fechaCreacion?: any;
}

interface KPI {
  operaciones: number;
  monto: number;
  enMora: number;
  usuarios: number;
}

const defaultForm = { nombre: "", direccion: "", telefono: "" };

export default function SucursalesPage() {
  const { entidadData, userData } = useAuth();
  const [sucursales, setSucursales]   = useState<Sucursal[]>([]);
  const [kpis, setKpis]               = useState<Record<string, KPI>>({});
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando]       = useState<Sucursal | null>(null);
  const [form, setForm]               = useState(defaultForm);
  const [guardando, setGuardando]     = useState(false);
  const [guardado, setGuardado]       = useState(false);
  const [detalle, setDetalle]         = useState<Sucursal | null>(null);
  const [usuariosSucursal, setUsuariosSucursal] = useState<any[]>([]);

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";
  const puedeGestionar = ["GERENTE_GENERAL", "MASTER_PAYSUR"].includes(userData?.rol || "");

  // ── Cargar sucursales y KPIs ──
  const cargar = async () => {
    if (!entidadData?.id) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "sucursales"),
          where("entidadId", "==", entidadData.id))
      );
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal));
      setSucursales(data);

      // KPIs por sucursal en paralelo
      const kpiMap: Record<string, KPI> = {};
      await Promise.all(data.map(async (s) => {
        const [opsSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, "operaciones"),
            where("entidadId", "==", entidadData.id),
            where("sucursalId", "==", s.id))),
          getDocs(query(collection(db, "usuarios"),
            where("entidadId", "==", entidadData.id),
            where("sucursalId", "==", s.id),
            where("activo", "==", true))),
        ]);
        const ops = opsSnap.docs.map(d => d.data());
        kpiMap[s.id] = {
          operaciones: ops.length,
          monto: ops
            .filter(o => o.estado === "LIQUIDADO" || o.estado === "FINALIZADO")
            .reduce((a, o) => a + (o.financiero?.montoSolicitado || 0), 0),
          enMora: ops.filter(o => o.estado === "EN_MORA").length,
          usuarios: usersSnap.size,
        };
      }));
      setKpis(kpiMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [entidadData]);

  // ── Cargar usuarios de una sucursal ──
  const cargarUsuarios = async (sucursalId: string) => {
    const snap = await getDocs(
      query(collection(db, "usuarios"),
        where("entidadId", "==", entidadData?.id),
        where("sucursalId", "==", sucursalId),
        where("activo", "==", true))
    );
    setUsuariosSucursal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // ── Abrir modal ──
  const abrirCrear = () => { setForm(defaultForm); setEditando(null); setModal("crear"); };
  const abrirEditar = (s: Sucursal) => { setForm({ nombre: s.nombre, direccion: s.direccion, telefono: s.telefono }); setEditando(s); setModal("editar"); };

  // ── Guardar ──
  const guardar = async () => {
    if (!form.nombre.trim()) { alert("El nombre es obligatorio."); return; }
    setGuardando(true);
    try {
      if (modal === "crear") {
        await addDoc(collection(db, "sucursales"), {
          ...form,
          entidadId: entidadData?.id,
          activa: true,
          fechaCreacion: serverTimestamp(),
        });
      } else if (editando) {
        await updateDoc(doc(db, "sucursales", editando.id), form);
      }
      setModal(null);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
      cargar();
    } catch { alert("Error al guardar."); }
    finally { setGuardando(false); }
  };

  // ── Eliminar ──
  const eliminar = async (s: Sucursal) => {
    if (!confirm(`¿Eliminar la sucursal "${s.nombre}"? Los usuarios y operaciones asociadas no se borran.`)) return;
    await deleteDoc(doc(db, "sucursales", s.id));
    cargar();
  };

  // ── Toggle activa ──
  const toggleActiva = async (s: Sucursal) => {
    await updateDoc(doc(db, "sucursales", s.id), { activa: !s.activa });
    cargar();
  };

  const fmt = (n: number) => n >= 1000000
    ? `$${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Sucursales</h1>
          <p className="text-gray-500 text-sm mt-1">{sucursales.length} sucursales · {entidadData?.nombreFantasia}</p>
        </div>
        {puedeGestionar && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 text-white font-bold rounded-xl text-sm"
            style={{ backgroundColor: colorPrimario }}>
            <Plus size={15} /> Nueva sucursal
          </button>
        )}
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-600" size={28} /></div>
      ) : sucursales.length === 0 ? (
        <div className="border-2 border-dashed border-gray-800 rounded-2xl py-20 text-center text-gray-600">
          <Building2 size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay sucursales creadas</p>
          {puedeGestionar && (
            <button onClick={abrirCrear} className="mt-4 text-sm font-bold underline" style={{ color: colorPrimario }}>
              Crear la primera
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sucursales.map(s => {
            const kpi = kpis[s.id] || { operaciones: 0, monto: 0, enMora: 0, usuarios: 0 };
            return (
              <div key={s.id} className={`bg-[#0A0A0A] border rounded-2xl p-5 transition-all ${!s.activa ? "opacity-50" : "border-gray-800"}`}>

                {/* Nombre y acciones */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${colorPrimario}22` }}>
                      <Building2 size={16} style={{ color: colorPrimario }} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{s.nombre}</p>
                      {s.direccion && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} />{s.direccion}</p>}
                      {s.telefono  && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{s.telefono}</p>}
                    </div>
                  </div>
                  {puedeGestionar && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleActiva(s)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${s.activa ? "border-green-800 text-green-400 bg-green-900/20" : "border-gray-700 text-gray-500"}`}>
                        {s.activa ? "Activa" : "Inactiva"}
                      </button>
                      <button onClick={() => abrirEditar(s)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => eliminar(s)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Ops",       valor: kpi.operaciones, color: "text-white" },
                    { label: "Originado", valor: fmt(kpi.monto),  color: "text-green-400" },
                    { label: "En mora",   valor: kpi.enMora,      color: kpi.enMora > 0 ? "text-red-400" : "text-gray-500" },
                    { label: "Usuarios",  valor: kpi.usuarios,    color: "text-blue-400" },
                  ].map((k, i) => (
                    <div key={i} className="bg-gray-900/60 rounded-xl p-2 text-center">
                      <p className={`font-black text-sm ${k.color}`}>{k.valor}</p>
                      <p className="text-[9px] text-gray-600 uppercase">{k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Ver detalle */}
                <button onClick={() => { setDetalle(s); cargarUsuarios(s.id); }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl border border-gray-800 text-gray-400 hover:bg-white/[0.03] hover:text-white transition-all">
                  Ver usuarios <ChevronRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CREAR/EDITAR ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-white">{modal === "crear" ? "Nueva sucursal" : "Editar sucursal"}</h2>
              <button onClick={() => setModal(null)}><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Nombre *",    key: "nombre",    placeholder: "Ej: Casa Central" },
                { label: "Dirección",   key: "direccion", placeholder: "Ej: Av. San Martín 123" },
                { label: "Teléfono",    key: "telefono",  placeholder: "Ej: 2612345678" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 uppercase mb-1.5 font-bold">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gray-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-sm hover:bg-white/[0.03]">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: colorPrimario }}>
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE USUARIOS ── */}
      {detalle && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-black text-white">{detalle.nombre}</h2>
                <p className="text-xs text-gray-500">{detalle.direccion}</p>
              </div>
              <button onClick={() => setDetalle(null)}><X size={18} className="text-gray-500" /></button>
            </div>

            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
              Usuarios activos ({usuariosSucursal.length})
            </p>

            {usuariosSucursal.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-6">Sin usuarios asignados a esta sucursal</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {usuariosSucursal.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-white">{u.nombre}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-gray-800 text-gray-400">
                      {u.rol?.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => { setDetalle(null); window.location.href = "/dashboard/equipo"; }}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold border border-gray-700 text-gray-400 hover:bg-white/[0.03] transition-all">
              Gestionar usuarios →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
