"use client";
// app/simular/[slug]/page.tsx
// Landing pública white-label: simulador + pre-aprobación BCRA + captura de lead
import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcularCuil(dni: string, sexo: string): string {
  const d = dni.padStart(8, "0");
  let pre = sexo === "M" ? "20" : "27";
  const mult = [5,4,3,2,7,6,5,4,3,2];
  let base = pre + d, suma = 0;
  for (let i = 0; i < 10; i++) suma += parseInt(base[i]) * mult[i];
  let dig = 11 - (suma % 11);
  if (dig === 11) dig = 0;
  if (dig === 10) { pre = "23"; dig = sexo === "M" ? 9 : 4; base = pre + d; }
  return base + String(dig);
}

function calcularCuota(monto: number, cuotas: number, tna: number, gastos: number, seguro: number): number {
  const tem = Math.pow(1 + tna / 100, 1 / 12) - 1;
  const cp = cuotas === 1 ? monto : monto * (tem * Math.pow(1 + tem, cuotas)) / (Math.pow(1 + tem, cuotas) - 1);
  return Math.round(cp + monto * ((gastos + seguro) / 100) / cuotas);
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// ── Componente ────────────────────────────────────────────────────────────────
function LandingSimulador() {
  const { slug }  = useParams() as { slug: string };
  const router    = useRouter();

  const [cfg,      setCfg]     = useState<any>(null);
  const [loading,  setLoading] = useState(true);
  const [paso,     setPaso]    = useState<"sim"|"datos"|"analizando"|"resultado">("sim");
  const [monto,    setMonto]   = useState(150000);
  const [cuotas,   setCuotas]  = useState(12);
  const [form,     setForm]    = useState({ nombre:"", telefono:"", email:"", dni:"", sexo:"M" });
  const [errores,  setErrores] = useState<Record<string,string>>({});
  const [resultado,setResultado] = useState<"APROBADO"|"OBSERVADO"|"RECHAZADO"|null>(null);
  const [bcra,     setBcra]    = useState<any>(null);
  const [leadId,   setLeadId]  = useState("");

  useEffect(() => {
    fetch(`/api/simular/${slug}`)
      .then(r => r.json())
      .then(d => { setCfg(d); setMonto(d.simulador?.montoMin || 50000); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const color    = cfg?.colorPrimario || "#FF5E14";
  const nombreEnt = cfg?.nombre       || "Simulador";
  const cuotaEst = cfg ? calcularCuota(monto, cuotas, cfg.simulador.tna, cfg.simulador.gastos, cfg.simulador.seguro) : 0;

  const validar = () => {
    const e: Record<string,string> = {};
    if (!form.nombre.trim())               e.nombre    = "Requerido";
    if (!form.telefono.match(/^\d{10,}$/)) e.telefono  = "10 dígitos sin espacios";
    if (!form.dni.match(/^\d{7,8}$/))     e.dni       = "DNI inválido";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const analizar = async () => {
    if (!validar()) return;
    setPaso("analizando");
    const cuil = calcularCuil(form.dni, form.sexo);

    // Consulta BCRA
    let bcraRes: any = { peorSituacion: 1, tieneDeudas: false, nombre: form.nombre };
    try {
      const r = await fetch("/api/bcra/route", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: form.dni, sexo: form.sexo }),
      });
      const d = await r.json();
      if (d.success) bcraRes = d.bcra;
    } catch {}

    // Scoring
    const sit = parseInt(String(bcraRes.peorSituacion || "1"));
    const max = cfg?.scoring?.bcraMaxSituacion ?? 2;
    let res: "APROBADO"|"OBSERVADO"|"RECHAZADO" = "APROBADO";
    if (sit > max) res = cfg?.scoring?.accionBcraExcedido === "RECHAZADO" ? "RECHAZADO" : "OBSERVADO";
    const scoring = { resultado: res, puntaje: sit === 1 ? 750 : sit === 2 ? 550 : 250 };

    setBcra(bcraRes);
    setResultado(res);

    // Guardar lead en background
    fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entidadId: cfg?.id, ...form, cuil, monto, cuotas, cuotaEstimada: cuotaEst, bcra: bcraRes, scoring }),
    }).then(r => r.json()).then(d => { if (d.leadId) setLeadId(d.leadId); }).catch(() => {});

    setPaso("resultado");
  };

  const irOnboarding = () => router.push(`/onboarding?leadId=${leadId}&entidadId=${cfg?.id}`);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#08090A" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#FF5E14 transparent transparent transparent" }}/>
    </div>
  );

  if (!cfg?.id) return (
    <div className="min-h-screen flex items-center justify-center text-white" style={{ background: "#08090A" }}>
      <div className="text-center space-y-3">
        <p className="text-5xl font-black text-gray-700">404</p>
        <p className="font-black text-xl">Entidad no encontrada</p>
        <p className="text-gray-600 text-sm">Verificá la URL o contactá a tu asesor.</p>
      </div>
    </div>
  );

  const BtnPrimario = ({ children, onClick }: any) => (
    <button onClick={onClick}
      className="w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:brightness-110 active:scale-[0.98]"
      style={{ background: color }}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen font-sans" style={{ background: "#08090A", color: "#F0F0F0" }}>

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4">
        {cfg.logoUrl
          ? <img src={cfg.logoUrl} alt={nombreEnt} className="h-8 object-contain"/>
          : <span className="text-lg font-black tracking-tight" style={{ color }}>{nombreEnt}</span>}
      </header>

      <main className="max-w-lg mx-auto px-5 py-10 space-y-6">

        {/* SIMULADOR */}
        {paso === "sim" && (
          <>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight leading-tight">{cfg.textos.tagline}</h1>
              <p className="text-gray-400 text-sm">{cfg.textos.subtitulo}</p>
            </div>

            {/* Cuota resultado */}
            <div className="rounded-2xl p-6 space-y-1" style={{ background:"#111215", border:`1px solid ${color}22` }}>
              <p className="text-xs uppercase tracking-widest font-bold" style={{ color }}>Cuota estimada</p>
              <p className="text-5xl font-black tracking-tight">{fmt(cuotaEst)}</p>
              <p className="text-gray-500 text-xs">{cuotas} cuotas · TNA {cfg.simulador.tna}%</p>
            </div>

            {/* Slider */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-500 uppercase font-bold tracking-widest">
                <span>Monto</span>
                <span className="text-white font-black text-base">{fmt(monto)}</span>
              </div>
              <input type="range"
                min={cfg.simulador.montoMin} max={cfg.simulador.montoMax} step={10000}
                value={monto} onChange={e => setMonto(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: color }}/>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{fmt(cfg.simulador.montoMin)}</span>
                <span>{fmt(cfg.simulador.montoMax)}</span>
              </div>
            </div>

            {/* Cuotas */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest font-bold text-gray-500">Plazo</p>
              <div className="grid grid-cols-4 gap-2">
                {cfg.simulador.cuotasOpciones.map((c: number) => (
                  <button key={c} onClick={() => setCuotas(c)}
                    className="py-2.5 rounded-xl text-sm font-black transition-all"
                    style={{
                      background: cuotas === c ? color : "#111215",
                      color:      cuotas === c ? "#fff" : "#888",
                      border:    `1px solid ${cuotas === c ? color : "#1f2023"}`,
                    }}>
                    {c}m
                  </button>
                ))}
              </div>
            </div>

            {/* Beneficios */}
            <div className="grid grid-cols-3 gap-2">
              {cfg.textos.beneficios.map((b: string, i: number) => (
                <div key={i} className="rounded-xl p-3 text-center text-xs text-gray-400"
                  style={{ background:"#111215", border:"1px solid #1f2023" }}>{b}</div>
              ))}
            </div>

            <BtnPrimario onClick={() => setPaso("datos")}>Solicitar este crédito →</BtnPrimario>

            {/* Cómo funciona */}
            <div className="pt-2 space-y-3">
              <p className="text-xs uppercase tracking-widest font-bold text-gray-600">Cómo funciona</p>
              {[
                ["01", "Simulá",       "Elegí monto y plazo sin compromiso."],
                ["02", "Verificamos",  "Chequeamos tu perfil crediticio al instante."],
                ["03", "Firmás",       "Todo digital, desde tu celular."],
                ["04", "Cobrás",       "Acreditación en tu cuenta en 24hs."],
              ].map(([n, t, d]) => (
                <div key={n} className="flex items-start gap-4 p-4 rounded-xl" style={{ background:"#111215" }}>
                  <span className="text-lg font-black shrink-0" style={{ color }}>{n}</span>
                  <div>
                    <p className="font-black text-white text-sm">{t}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* DATOS */}
        {paso === "datos" && (
          <>
            <button onClick={() => setPaso("sim")} className="text-gray-500 hover:text-white text-sm transition-colors">
              ← Volver
            </button>
            <div>
              <h2 className="text-2xl font-black">Tus datos</h2>
              <p className="text-gray-500 text-sm mt-1">Para verificar tu perfil al instante.</p>
            </div>

            {/* Resumen */}
            <div className="flex gap-3 p-4 rounded-xl" style={{ background:"#111215", border:`1px solid ${color}33` }}>
              {[["Monto",fmt(monto)],["Cuotas",String(cuotas)],["Cuota",fmt(cuotaEst)]].map(([l,v],i) => (
                <div key={i} className="flex-1 text-center">
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="font-black text-white text-sm">{v}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {([
                ["nombre",   "Nombre y apellido",    "text",  "Juan Pérez"],
                ["telefono", "Teléfono (WhatsApp)",  "tel",   "2614000000"],
                ["email",    "Email (opcional)",     "email", "juan@email.com"],
              ] as [string,string,string,string][]).map(([k,l,t,ph]) => (
                <div key={k}>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">{l}</label>
                  <input type={t} placeholder={ph} value={(form as any)[k]}
                    onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                    style={{ background:"#111215", border:`1px solid ${errores[k] ? "#f87171" : "#1f2023"}` }}/>
                  {errores[k] && <p className="text-xs text-red-400 mt-1">{errores[k]}</p>}
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">DNI</label>
                  <input type="number" placeholder="12345678" value={form.dni}
                    onChange={e => setForm(p => ({ ...p, dni: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                    style={{ background:"#111215", border:`1px solid ${errores.dni ? "#f87171" : "#1f2023"}` }}/>
                  {errores.dni && <p className="text-xs text-red-400 mt-1">{errores.dni}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1.5">Sexo (DNI)</label>
                  <select value={form.sexo} onChange={e => setForm(p => ({ ...p, sexo: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                    style={{ background:"#111215", border:"1px solid #1f2023" }}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Tu CUIL se calcula automáticamente. Consultamos el BCRA para darte respuesta inmediata.
              </p>

              <BtnPrimario onClick={analizar}>Verificar mi perfil →</BtnPrimario>
            </div>
          </>
        )}

        {/* ANALIZANDO */}
        {paso === "analizando" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor:`${color} transparent transparent transparent` }}/>
            <div>
              <p className="font-black text-white text-lg">Analizando tu perfil</p>
              <p className="text-gray-500 text-sm mt-1">Consultando BCRA y calculando scoring…</p>
            </div>
            {["Verificando identidad…","Consultando central de deudores…","Calculando perfil crediticio…"].map((t,i) => (
              <p key={i} className="text-xs text-gray-600 animate-pulse"
                style={{ animationDelay:`${i*0.5}s` }}>{t}</p>
            ))}
          </div>
        )}

        {/* RESULTADO */}
        {paso === "resultado" && resultado && (
          <>
            <div className="rounded-2xl p-6 text-center space-y-2"
              style={{
                background: resultado === "APROBADO" ? "#0a1f0a" : resultado === "OBSERVADO" ? "#1a1400" : "#1a0a0a",
                border: `1px solid ${resultado === "APROBADO" ? "#16a34a44" : resultado === "OBSERVADO" ? "#ca8a0444" : "#dc262644"}`,
              }}>
              <p className="text-4xl">{resultado === "APROBADO" ? "🎉" : resultado === "OBSERVADO" ? "👀" : "❌"}</p>
              <p className="font-black text-white text-xl">
                {resultado === "APROBADO"  ? cfg.scoring.mensajeAprobado  :
                 resultado === "OBSERVADO" ? cfg.scoring.mensajeObservado :
                 cfg.scoring.mensajeRechazo}
              </p>
              <p className="text-xs" style={{
                color: resultado === "APROBADO" ? "#4ade80" : resultado === "OBSERVADO" ? "#facc15" : "#f87171"
              }}>
                Situación BCRA: {bcra?.peorSituacion || 1}
                {bcra?.nombre ? ` · ${bcra.nombre}` : ""}
              </p>
            </div>

            {resultado !== "RECHAZADO" && (
              <div className="rounded-2xl p-5 space-y-3" style={{ background:"#111215", border:"1px solid #1f2023" }}>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-500">Tu simulación</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[["Monto",fmt(monto)],["Cuotas",String(cuotas)],["Cuota est.",fmt(cuotaEst)]].map(([l,v],i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background:"#0d0e10" }}>
                      <p className="font-black text-white text-base">{v}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado !== "RECHAZADO"
              ? <BtnPrimario onClick={irOnboarding}>
                  {resultado === "APROBADO" ? "Iniciar solicitud completa →" : "Continuar — un asesor te contactará →"}
                </BtnPrimario>
              : <div className="rounded-2xl p-5 text-center" style={{ background:"#111215" }}>
                  <p className="text-sm text-gray-400">
                    En este momento tu perfil no cumple los requisitos mínimos.
                    Podés volver a solicitar en 90 días.
                  </p>
                </div>}

            <button onClick={() => { setPaso("sim"); setResultado(null); }}
              className="w-full py-3 rounded-2xl text-gray-500 hover:text-white text-sm font-bold transition-colors"
              style={{ border:"1px solid #1f2023" }}>
              Simular otro monto
            </button>
          </>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-700 border-t border-white/5 mt-6">
        {nombreEnt} · Simulación sin carácter vinculante · La cuota final puede variar según evaluación crediticia
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background:"#08090A" }}>
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/>
      </div>}>
      <LandingSimulador/>
    </Suspense>
  );
}
