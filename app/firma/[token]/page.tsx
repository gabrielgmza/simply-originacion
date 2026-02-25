"use client";
import { useState } from "react";
import { ShieldCheck, Smartphone, Lock, ArrowRight } from "lucide-react";

export default function PantallaVerificacionOTP() {
  const [paso, setPaso] = useState('SOLICITUD'); // SOLICITUD -> VALIDACION -> CONTRATO
  const [codigo, setCodigo] = useState("");

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0A0A0A] border border-gray-800 rounded-[48px] p-10 text-center shadow-2xl">
        <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
          <ShieldCheck className="text-blue-500" size={40} />
        </div>

        {paso === 'SOLICITUD' ? (
          <div className="animate-in fade-in duration-500">
            <h1 className="text-2xl font-black text-white mb-4 italic tracking-tighter">Validación de Identidad</h1>
            <p className="text-gray-500 text-sm mb-10 leading-relaxed">
              Para acceder a tu contrato, enviaremos un código de seguridad de 6 dígitos a tu dispositivo.
            </p>
            <button 
              onClick={() => setPaso('VALIDACION')}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-blue-500 transition-all"
            >
              <Smartphone size={20}/> ENVIAR CÓDIGO POR SMS
            </button>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-white mb-8">Ingresa el código</h2>
            <input 
              type="text"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              placeholder="0 0 0 0 0 0"
              className="w-full bg-transparent border-b-2 border-gray-800 text-center text-5xl font-black text-white tracking-[0.5em] outline-none focus:border-blue-500 mb-12 pb-4 transition-colors"
            />
            <button className="w-full bg-white text-black py-5 rounded-3xl font-black flex items-center justify-center gap-3">
              VERIFICAR Y FIRMAR <ArrowRight size={20}/>
            </button>
            <p className="mt-6 text-[10px] text-gray-600 font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors" onClick={() => setPaso('SOLICITUD')}>
              Solicitar nuevo código
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
