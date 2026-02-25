"use client";
import { useState } from "react";
import { User, MapPin, Landmark, Phone, Mail, Save } from "lucide-react";

export default function LegajoRefactorizado() {
  return (
    <div className="p-10 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white italic mb-10 tracking-tighter">Legajo Digital: Información Detallada</h1>
      
      <div className="bg-[#0A0A0A] border border-gray-800 p-10 rounded-[48px] space-y-12">
        {/* SECCIÓN: IDENTIDAD (CAMPOS SEPARADOS) */}
        <section className="space-y-6">
          <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <User size={14}/> Datos de Identidad
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <input placeholder="Primer Nombre" className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" />
            <input placeholder="Segundo Nombre" className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
            <input placeholder="Apellido Paterno" className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" />
            <input placeholder="Apellido Materno" className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" />
          </div>
        </section>

        {/* SECCIÓN: UBICACIÓN GEOGRÁFICA */}
        <section className="space-y-6">
          <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <MapPin size={14}/> Domicilio y Localización
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <input placeholder="Dirección (Calle y Altura)" className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none col-span-1 md:col-span-2" />
            <input placeholder="Código Postal" className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
            <input placeholder="Localidad" className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
            <input placeholder="Provincia" className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
            <select className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none">
              <option>Estado Civil</option>
              <option>Soltero/a</option>
              <option>Casado/a</option>
              <option>Divorciado/a</option>
            </select>
          </div>
        </section>

        {/* SECCIÓN: CONTACTO Y BANCO */}
        <section className="space-y-6">
          <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Landmark size={14}/> Información de Contacto y Pago
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input placeholder="Email Personal" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
              <input placeholder="Teléfono Celular" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
            </div>
            <div className="space-y-4">
              <input placeholder="Nombre del Banco" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
              <input placeholder="CBU / CVU (22 dígitos)" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none" />
            </div>
          </div>
        </section>

        <button className="w-full bg-white text-black py-6 rounded-3xl font-black flex justify-center items-center gap-3 hover:bg-gray-200 transition-all uppercase italic tracking-widest">
          <Save size={20}/> Guardar y Validar Legajo
        </button>
      </div>
    </div>
  );
}
