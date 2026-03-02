"use client";
import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs,
  doc, updateDoc, setDoc, serverTimestamp
} from "firebase/firestore";
import {
  getApps, initializeApp
} from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signOut
} from "firebase/auth";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Users, Plus, Shield, CheckCircle2, XCircle,
  Loader2, ChevronRight, X, Lock, Eye, EyeOff, Save
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Rol = "GERENTE_GENERAL" | "GERENTE_SUCURSAL" | "SUPERVISOR_SUCURSAL" | "VENDEDOR" | "LIQUIDADOR";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  sucursalId?: string;
  activo: boolean;
  permisos?: Record<string, boolean>;
  fechaCreacion?: any;
}

// ─── PERMISOS POR ROL (defaults) ──────────────────────────────────────────────
const PERMISOS_DEFAULT: Record<Rol, Record<string, boolean>> = {
  GERENTE_GENERAL:    { verCBU: true,  liquidar: true,  editarTasas: true,  gestionarUsuarios: true,  verReportes: true,  aprobar: true  },
  GERENTE_SUCURSAL:   { verCBU: true,  liquidar: true,  editarTasas: false, gestionarUsuarios: true,  verReportes: true,  aprobar: true  },
  SUPERVISOR_SUCURSAL:{ verCBU: true,  liquidar: false, editarTasas: false, gestionarUsuarios: false, verReportes: true,  aprobar: true  },
  VENDEDOR:           { verCBU: false, liquidar: false, editarTasas: false, gestionarUsuarios: false, verReportes: false, aprobar: false },
  LIQUIDADOR:         { verCBU: true,  liquidar: true,  editarTasas: false, gestionarUsuarios: false, verReportes: false, aprobar: false },
};

const PERMISOS_LABELS: Record<string, string> = {
  verCBU:            "Ver CBU del cliente",
  liquidar:          "Liquidar créditos",
  editarTasas:       "Editar tasas y parámetros",
  gestionarUsuarios: "Gestionar usuarios",
  verReportes:       "Ver reportes",
  aprobar:           "Aprobar / rechazar operaciones",
};

const ROL_COLORS: Record<Rol, string> = {
  GERENTE_GENERAL:    "bg-purple-900/30 text-purple-400 border-purple-800/50",
  GERENTE_SUCURSAL:   "bg-blue-900/30 text-blue-400 border-blue-800/50",
  SUPERVISOR_SUCURSAL:"bg-yellow-900/30 text-yellow-400 border-yellow-800/50",
  VENDEDOR:           "bg-green-900/30 text-green-400 border-green-800/50",
  LIQUIDADOR:         "bg-orange-900/30 text-orange-400 border-orange-800/50",
};

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function EquipoPage() {
  const { entidadData, userData } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const colorPrimario = entidadData?.configuracion?.colorPrimario || "#FF5E14";

  // Form nuevo usuario
  const [form, setForm] = useState({
    nombre: "", email: "", password: "", rol: "VENDEDOR" as Rol, sucursalId: ""
  });
  const [mostrarPass, setMostrarPass] = useState(false);

  // Permisos del usuario editando
  const [permisosEdit, setPermisosEdit] = useState<Record<string, boolean>>({});

  // ── Cargar usuarios ──
  const cargar = async () => {
    if (!entidadData?.id) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "usuarios"), where("entidadId", "==", entidadData.id))
      );
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() } as Usuario)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [entidadData]);

  // ── Crear usuario con Firebase secundario ──
  const crearUsuario = async () => {
    if (!form.nombre || !form.email || !form.password) {
      alert("Completá todos los campos."); return;
    }
    if (form.password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres."); return;
    }
    setProcesando(true);
    try {
      // Firebase secundario para no cerrar sesión del admin
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      const apps = getApps();
      const secondary = apps.find(a => a.name === "Secondary") ||
        initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondary);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const uid = cred.user.uid;

      const permisos = PERMISOS_DEFAULT[form.rol];

      await setDoc(doc(db, "usuarios", uid), {
        uid,
        nombre: form.nombre,
        email: form.email.toLowerCase(),
        rol: form.rol,
        entidadId: entidadData?.id,
        sucursalId: form.sucursalId || null,
        activo: true,
        permisos,
        fechaCreacion: serverTimestamp(),
      });

      await signOut(secondaryAuth);

      setModalCrear(false);
      setForm({ nombre: "", email: "", password: "", rol: "VENDEDOR", sucursalId: "" });
      cargar();
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") alert("Ese email ya está registrado.");
      else alert("Error al crear el usuario: " + e.message);
    } finally { setProcesando(false); }
  };

  // ── Activar / desactivar ──
  const toggleActivo = async (u: Usuario) => {
    await updateDoc(doc(db, "usuarios", u.id), { activo: !u.activo });
    cargar();
  };

  // ── Editar rol y sucursal ──
  const abrirEditar = (u: Usuario) => {
    setUsuarioEditando(u);
    setPermisosEdit(u.permisos || PERMISOS_DEFAULT[u.rol] || {});
  };

  const guardarEdicion = async () => {
    if (!usuarioEditando) return;
    setProcesando(true);
    try {
      await updateDoc(doc(db, "usuarios", usuarioEditando.id), {
        rol: usuarioEditando.rol,
        sucursalId: usuarioEditando.sucursalId || null,
        permisos: permisosEdit,
      });
      setUsuarioEditando(null);
      cargar();
    } catch (e) { alert("Error al guardar."); }
    finally { setProcesando(false); }
  };

  // Al cambiar rol en edición, actualizar permisos default
  const cambiarRolEdit = (rol: Rol) => {
    setUsuarioEditando(prev => prev ? { ...prev, rol } : null);
    setPermisosEdit(PERMISOS_DEFAULT[rol]);
  };

  // ── Filtrar ──
  const usuariosFiltrados = usuarios.filter(u =>
    u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.rol?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Equipo y Roles</h1>
          <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuarios en tu entidad</p>
        </div>
        <button onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-colors"
          style={{ backgroundColor: colorPrimario }}>
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {/* BÚSQUEDA */}
      <input placeholder="Buscar por nombre, email o rol..."
        value={busqueda} onChange={e => setBusqueda(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />

      {/* LISTA */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
      ) : (
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-gray-900">
              <tr>
                {["Usuario", "Rol", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {usuariosFiltrados.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white text-sm">{u.nombre}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${ROL_COLORS[u.rol] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                      {u.rol?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActivo(u)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${
                        u.activo
                          ? "bg-green-900/30 text-green-400 hover:bg-red-900/30 hover:text-red-400"
                          : "bg-red-900/30 text-red-400 hover:bg-green-900/30 hover:text-green-400"
                      }`}>
                      {u.activo ? <><CheckCircle2 size={12} /> Activo</> : <><XCircle size={12} /> Inactivo</>}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => abrirEditar(u)}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-xl transition-colors">
                      <Shield size={12} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usuariosFiltrados.length === 0 && (
            <p className="text-center text-gray-600 py-10 text-sm">No hay usuarios.</p>
          )}
        </div>
      )}

      {/* ── MODAL CREAR USUARIO ── */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black">Nuevo Usuario</h3>
              <button onClick={() => setModalCrear(false)}><X size={20} className="text-gray-500" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Nombre completo</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Juan García"
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="juan@entidad.com"
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Contraseña inicial</label>
                <div className="relative">
                  <input type={mostrarPass ? "text" : "password"} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none pr-10" />
                  <button onClick={() => setMostrarPass(!mostrarPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {mostrarPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Rol</label>
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value as Rol })}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                  {(["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","VENDEDOR","LIQUIDADOR"] as Rol[]).map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              {/* Permisos preview */}
              <div className="bg-gray-900/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 uppercase mb-2 font-bold">Permisos del rol</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(PERMISOS_DEFAULT[form.rol]).map(([k, v]) => (
                    <div key={k} className={`text-xs flex items-center gap-1 ${v ? "text-green-400" : "text-gray-600"}`}>
                      {v ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {PERMISOS_LABELS[k]}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalCrear(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={crearUsuario} disabled={procesando}
                className="flex-1 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                style={{ backgroundColor: colorPrimario }}>
                {procesando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Crear usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR ROL Y PERMISOS ── */}
      {usuarioEditando && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black">{usuarioEditando.nombre}</h3>
                <p className="text-xs text-gray-500">{usuarioEditando.email}</p>
              </div>
              <button onClick={() => setUsuarioEditando(null)}><X size={20} className="text-gray-500" /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Rol</label>
                <select value={usuarioEditando.rol} onChange={e => cambiarRolEdit(e.target.value as Rol)}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                  {(["GERENTE_GENERAL","GERENTE_SUCURSAL","SUPERVISOR_SUCURSAL","VENDEDOR","LIQUIDADOR"] as Rol[]).map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase mb-3 font-bold">Permisos granulares</label>
                <div className="space-y-2">
                  {Object.entries(permisosEdit).map(([k, v]) => (
                    <div key={k}
                      onClick={() => setPermisosEdit(prev => ({ ...prev, [k]: !v }))}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        v ? "border-green-800/50 bg-green-900/20" : "border-gray-800 bg-gray-900/30 hover:border-gray-700"
                      }`}>
                      <span className="text-sm text-gray-300">{PERMISOS_LABELS[k]}</span>
                      <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${v ? "bg-green-500" : "bg-gray-700"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${v ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setUsuarioEditando(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={procesando}
                className="flex-1 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                style={{ backgroundColor: colorPrimario }}>
                {procesando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
