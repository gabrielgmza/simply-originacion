"use client";

import { useEffect, useState } from "react";
import {
  collection, addDoc, getDocs, serverTimestamp,
  query, orderBy, doc, updateDoc, getDoc
} from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp, getApps, getApp } from "firebase/app";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, Users, LayoutDashboard, LogOut,
  Loader2, ShieldOff, ShieldCheck, ToggleLeft, ToggleRight,
  TrendingUp, DollarSign, FileText, X, AlertTriangle
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Entidad {
  id: string;
  razonSocial: string;
  nombreFantasia: string;
  cuit: string;
  contacto: { email: string; telefono: string };
  activa: boolean;
  configuracion: {
    moduloCuad: boolean;
    moduloAdelantos: boolean;
    moduloPrivados: boolean;
    colorPrimario: string;
  };
  metricas?: {
    operacionesTotales?: number;
    montoTotalOriginado?: number;
  };
  fechaCreacion: any;
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Modales
  const [modalEntidad, setModalEntidad] = useState(false);
  const [modalGerente, setModalGerente] = useState(false);
  const [modalBloqueo, setModalBloqueo] = useState<Entidad | null>(null);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<Entidad | null>(null);

  // Formularios
  const [nuevaEntidad, setNuevaEntidad] = useState({
    razonSocial: "", nombreFantasia: "", cuit: "",
    emailContacto: "", telefonoContacto: ""
  });
  const [nuevoGerente, setNuevoGerente] = useState({ nombre: "", email: "", password: "" });

  // ── Auth guard ──
  useEffect(() => {
    if (!loading) {
      if (!userData || userData.rol !== "MASTER_PAYSUR") {
        router.push("/login");
      } else {
        cargarEntidades();
      }
    }
  }, [userData, loading]);

  // ── Cargar entidades ──
  const cargarEntidades = async () => {
    setCargandoDatos(true);
    try {
      const q = query(collection(db, "entidades"), orderBy("fechaCreacion", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Entidad));
      setEntidades(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoDatos(false);
    }
  };

  // ── Crear entidad ──
  const handleCrearEntidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await addDoc(collection(db, "entidades"), {
        razonSocial: nuevaEntidad.razonSocial,
        nombreFantasia: nuevaEntidad.nombreFantasia,
        cuit: nuevaEntidad.cuit,
        contacto: { email: nuevaEntidad.emailContacto, telefono: nuevaEntidad.telefonoContacto },
        activa: true,
        configuracion: {
          tasaInteresBase: 0,
          gastosOtorgamiento: 0,
          colorPrimario: "#FF5E14",
          moduloAdelantos: true,
          moduloCuad: true,
          moduloPrivados: true,
        },
        metricas: { operacionesTotales: 0, montoTotalOriginado: 0 },
        fechaCreacion: serverTimestamp(),
      });
      setModalEntidad(false);
      setNuevaEntidad({ razonSocial: "", nombreFantasia: "", cuit: "", emailContacto: "", telefonoContacto: "" });
      cargarEntidades();
    } catch (e) {
      console.error(e);
      alert("Error al crear entidad.");
    } finally {
      setProcesando(false);
    }
  };

  // ── Crear Gerente General ──
  const handleCrearGerente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadSeleccionada) return;
    setProcesando(true);
    try {
      // App secundaria para no cerrar sesión del SuperAdmin
      const secondaryApp = getApps().find(a => a.name === "secondary") ||
        initializeApp(
          (await getDoc(doc(db, "_config", "firebase"))).data() as any ??
          { apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID },
          "secondary"
        );
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, nuevoGerente.email, nuevoGerente.password);

      await addDoc(collection(db, "usuarios"), {
        uid: cred.user.uid,
        nombre: nuevoGerente.nombre,
        email: nuevoGerente.email,
        rol: "GERENTE_GENERAL",
        entidadId: entidadSeleccionada.id,
        activo: true,
        fechaCreacion: serverTimestamp(),
      });

      await secondaryAuth.signOut();
      setModalGerente(false);
      setNuevoGerente({ nombre: "", email: "", password: "" });
      alert(`✅ Gerente creado para ${entidadSeleccionada.nombreFantasia}`);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setProcesando(false);
    }
  };

  // ── Bloquear / Desbloquear entidad ──
  const toggleBloqueo = async () => {
    if (!modalBloqueo) return;
    setProcesando(true);
    try {
      await updateDoc(doc(db, "entidades", modalBloqueo.id), {
        activa: !modalBloqueo.activa,
        fechaActualizacion: serverTimestamp(),
      });
      setModalBloqueo(null);
      cargarEntidades();
    } catch (e) {
      alert("Error al cambiar estado.");
    } finally {
      setProcesando(false);
    }
  };

  // ── Toggle Feature Flag ──
  const toggleFeature = async (entidad: Entidad, modulo: "moduloCuad" | "moduloAdelantos" | "moduloPrivados") => {
    try {
      await updateDoc(doc(db, "entidades", entidad.id), {
        [`configuracion.${modulo}`]: !entidad.configuracion[modulo],
        fechaActualizacion: serverTimestamp(),
      });
      cargarEntidades();
    } catch (e) {
      alert("Error al cambiar módulo.");
    }
  };

  // ── Métricas globales ──
  const totalOps = entidades.reduce((a, e) => a + (e.metricas?.operacionesTotales || 0), 0);
  const totalMonto = entidades.reduce((a, e) => a + (e.metricas?.montoTotalOriginado || 0), 0);

  // ──────────────────────────────────────────────────────────────────────────
  if (loading || cargandoDatos) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#FF5E14]">
        <Loader2 className="animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8F9FA] font-sans">

      {/* NAV */}
      <nav className="border-b border-gray-800 bg-[#0A0A0A] px-8 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-[#FF5E14]" size={20} />
          <h1 className="text-lg font-bold">Simply Core <span className="text-gray-500 font-normal">| SuperAdmin</span></h1>
        </div>
        <button onClick={() => { auth.signOut(); router.push("/login"); }}
          className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
          <LogOut size={16} /> Salir
        </button>
      </nav>

      <main className="p-8 max-w-7xl mx-auto">

        {/* MÉTRICAS GLOBALES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <MetricCard icon={<Building2 />} label="Entidades Activas" value={entidades.filter(e => e.activa).length.toString()} />
          <MetricCard icon={<FileText />} label="Operaciones Totales" value={totalOps.toLocaleString("es-AR")} />
          <MetricCard icon={<DollarSign />} label="Monto Originado" value={`$${(totalMonto / 1000000).toFixed(1)}M`} />
        </div>

        {/* ENCABEZADO */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Entidades Clientes</h2>
            <p className="text-gray-400 text-sm mt-1">Gestión de tenants, módulos y accesos.</p>
          </div>
          <button onClick={() => setModalEntidad(true)}
            className="bg-[#FF5E14] hover:bg-[#E04D0B] text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Plus size={18} /> Alta de Entidad
          </button>
        </div>

        {/* TABLA DE ENTIDADES */}
        <div className="space-y-4">
          {entidades.map((entidad) => (
            <div key={entidad.id}
              className={`bg-[#0A0A0A] border rounded-xl p-6 transition-colors ${entidad.activa ? "border-gray-800" : "border-red-900/50 opacity-60"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                {/* INFO */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${entidad.activa ? "bg-gray-900 text-[#FF5E14]" : "bg-red-900/20 text-red-500"}`}>
                    <Building2 size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{entidad.nombreFantasia}</h3>
                      {!entidad.activa && (
                        <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded font-bold uppercase">BLOQUEADA</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{entidad.razonSocial} · CUIT: {entidad.cuit}</p>
                    <p className="text-xs text-gray-600 mt-1">{entidad.contacto?.email}</p>
                  </div>
                </div>

                {/* FEATURE FLAGS */}
                <div className="flex flex-wrap gap-2">
                  <FeatureToggle
                    label="CUAD"
                    activo={entidad.configuracion?.moduloCuad}
                    onClick={() => toggleFeature(entidad, "moduloCuad")}
                  />
                  <FeatureToggle
                    label="Adelantos"
                    activo={entidad.configuracion?.moduloAdelantos}
                    onClick={() => toggleFeature(entidad, "moduloAdelantos")}
                  />
                  <FeatureToggle
                    label="Préstamos"
                    activo={entidad.configuracion?.moduloPrivados}
                    onClick={() => toggleFeature(entidad, "moduloPrivados")}
                  />
                </div>

                {/* ACCIONES */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setEntidadSeleccionada(entidad); setModalGerente(true); }}
                    className="bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Users size={14} /> Gerente
                  </button>
                  <button
                    onClick={() => setModalBloqueo(entidad)}
                    className={`text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      entidad.activa
                        ? "bg-red-900/20 hover:bg-red-900/40 text-red-400"
                        : "bg-green-900/20 hover:bg-green-900/40 text-green-400"
                    }`}>
                    {entidad.activa ? <><ShieldOff size={14} /> Bloquear</> : <><ShieldCheck size={14} /> Activar</>}
                  </button>
                </div>
              </div>

              {/* MÉTRICAS POR ENTIDAD */}
              <div className="mt-4 pt-4 border-t border-gray-800/50 flex gap-6 text-xs text-gray-500">
                <span>Ops: <strong className="text-gray-300">{entidad.metricas?.operacionesTotales || 0}</strong></span>
                <span>Monto: <strong className="text-gray-300">${(entidad.metricas?.montoTotalOriginado || 0).toLocaleString("es-AR")}</strong></span>
              </div>
            </div>
          ))}

          {entidades.length === 0 && (
            <div className="text-center text-gray-600 py-20">No hay entidades. Creá la primera.</div>
          )}
        </div>
      </main>

      {/* MODAL: NUEVA ENTIDAD */}
      {modalEntidad && (
        <Modal titulo="Alta de Entidad" onClose={() => setModalEntidad(false)}>
          <form onSubmit={handleCrearEntidad} className="space-y-4">
            <Input label="Razón Social" value={nuevaEntidad.razonSocial} onChange={v => setNuevaEntidad({ ...nuevaEntidad, razonSocial: v })} required />
            <Input label="Nombre Fantasía" value={nuevaEntidad.nombreFantasia} onChange={v => setNuevaEntidad({ ...nuevaEntidad, nombreFantasia: v })} required />
            <Input label="CUIT" value={nuevaEntidad.cuit} onChange={v => setNuevaEntidad({ ...nuevaEntidad, cuit: v })} required />
            <Input label="Email de Contacto" type="email" value={nuevaEntidad.emailContacto} onChange={v => setNuevaEntidad({ ...nuevaEntidad, emailContacto: v })} required />
            <Input label="Teléfono" value={nuevaEntidad.telefonoContacto} onChange={v => setNuevaEntidad({ ...nuevaEntidad, telefonoContacto: v })} />
            <SubmitBtn loading={procesando} label="Crear Entidad" />
          </form>
        </Modal>
      )}

      {/* MODAL: NUEVO GERENTE */}
      {modalGerente && entidadSeleccionada && (
        <Modal titulo={`Crear Gerente — ${entidadSeleccionada.nombreFantasia}`} onClose={() => setModalGerente(false)}>
          <form onSubmit={handleCrearGerente} className="space-y-4">
            <Input label="Nombre Completo" value={nuevoGerente.nombre} onChange={v => setNuevoGerente({ ...nuevoGerente, nombre: v })} required />
            <Input label="Email" type="email" value={nuevoGerente.email} onChange={v => setNuevoGerente({ ...nuevoGerente, email: v })} required />
            <Input label="Contraseña (mín 6 caracteres)" type="password" value={nuevoGerente.password} onChange={v => setNuevoGerente({ ...nuevoGerente, password: v })} required />
            <SubmitBtn loading={procesando} label="Crear Cuenta" />
          </form>
        </Modal>
      )}

      {/* MODAL: CONFIRMAR BLOQUEO */}
      {modalBloqueo && (
        <Modal titulo={modalBloqueo.activa ? "Bloquear Entidad" : "Activar Entidad"} onClose={() => setModalBloqueo(null)}>
          <div className="flex items-start gap-3 mb-6 p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-xl">
            <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              {modalBloqueo.activa
                ? `Al bloquear "${modalBloqueo.nombreFantasia}", sus usuarios no podrán iniciar sesión ni crear operaciones.`
                : `Al activar "${modalBloqueo.nombreFantasia}", sus usuarios recuperarán el acceso inmediatamente.`}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalBloqueo(null)}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
            <button onClick={toggleBloqueo} disabled={procesando}
              className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                modalBloqueo.activa
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-700 hover:bg-green-600 text-white"
              }`}>
              {procesando ? <Loader2 size={16} className="animate-spin" /> : null}
              {modalBloqueo.activa ? "Sí, bloquear" : "Sí, activar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SUB-COMPONENTES ───────────────────────────────────────────────────────────

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 flex items-center gap-4">
      <div className="p-3 bg-gray-900 rounded-lg text-[#FF5E14]">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function FeatureToggle({ label, activo, onClick }: { label: string; activo: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        activo
          ? "bg-green-900/30 text-green-400 border border-green-800/50"
          : "bg-gray-900 text-gray-500 border border-gray-800"
      }`}>
      {activo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
      {label}
    </button>
  );
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">{titulo}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type={type} value={value} required={required}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500 transition-colors"
      />
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2">
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {label}
    </button>
  );
}
