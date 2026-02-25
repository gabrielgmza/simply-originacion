"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Smartphone, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { useParams } from "next/navigation";

export default function ValidacionFirmaOTP() {
  const { token } = useParams();
  const [paso, setPaso] = useState('SOLICITUD'); // SOLICITUD, VERIFICACION, CONTRATO
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const enviarCodigo = async () => {
    setLoading(true);
    // Simulación de envío a través del motor OTP que creamos en lib/verificacion
    setTimeout(() => {
      setLoading(false);
      setPaso('VERIFICACION');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#0A0A0A] border border-gray-800 rounded-[40px] p-10 shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/20">
            <ShieldCheck className="text-blue-500" size={40} />
          </div>
        </div>

        {paso === 'SOLICITUD' && (
          <div className="text-center animate-in fade-in duration-500">
            <h1 className="text-2xl font-black text-white mb-3 italic tracking-tighter">Validación de Identidad</h1>
            <p className="text-gray-400 text-sm mb-10 leading-relaxed">
              Para garantizar la seguridad jurídica de tu firma, enviaremos un código de 6 dígitos a tu dispositivo.
            </p>
            <button 
              onClick={enviarCodigo}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-3xl font-black transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Generando código..." : "ENVIAR CÓDIGO DE ACCESO"}
            </button>
          </div>
        )}

        {paso === 'VERIFICACION' && (
          <div className="text-center animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-white mb-2">Ingresa el código</h2>
            <p className="text-gray-500 text-xs mb-8 uppercase tracking-widest font-black">Enviado vía SMS / WhatsApp</p>
            <input 
              type="text"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full bg-transparent border-b-2 border-gray-800 text-center text-5xl font-black text-white tracking-[0.5em] outline-none focus:border-blue-500 mb-12 pb-4 transition-colors"
            />
            <div className="flex flex-col gap-4">
              <button className="w-full bg-white text-black py-5 rounded-3xl font-black hover:bg-gray-200 transition-all">
                VERIFICAR Y FIRMAR
              </button>
              <button onClick={() => setPaso('SOLICITUD')} className="text-gray-600 text-[10px] font-black uppercase hover:text-white transition-colors">
                No recibí el código
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
