"use client";

import { useAuth } from "@/context/AuthContext";
import { Building2, Users, Wallet, TrendingUp } from "lucide-react";

export default function GerenciaDashboard() {
  const { entidadData, userData } = useAuth();

  if (!entidadData) return null;

  const colorPrimario = entidadData.configuracion?.colorPrimario || "#FF5E14";

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <header className="mb-10 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Centro de Gerencia</h1>
        <p className="text-gray-400">Bienvenido, {userData?.nombre}. Resumen operativo de {entidadData.nombreFantasia}.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-gray-900" style={{ color: colorPrimario }}>
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Capital Colocado</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-gray-900 text-green-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Operaciones Mes</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-gray-900 text-blue-500">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Módulos Activos</p>
              <div className="flex gap-2 mt-1">
                {entidadData.configuracion.moduloAdelantos && <span className="px-2 py-0.5 bg-gray-800 text-xs rounded">Adelantos</span>}
                {entidadData.configuracion.moduloCuad && <span className="px-2 py-0.5 bg-gray-800 text-xs rounded">CUAD</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-gray-900 text-purple-500">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Equipo Activo</p>
              <p className="text-2xl font-bold">1</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-8 text-center">
        <Building2 size={48} className="mx-auto text-gray-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Configuración Base Requerida</h2>
        <p className="text-gray-400 max-w-lg mx-auto mb-6">
          Para comenzar a originar créditos, debes configurar las tasas de interés de tus líneas activas y crear las cuentas para tus vendedores.
        </p>
        <div className="flex justify-center gap-4">
          <button className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
            Configurar Tasas
          </button>
          <button style={{ backgroundColor: colorPrimario }} className="text-white font-bold py-2 px-6 rounded-lg opacity-90 hover:opacity-100 transition-opacity">
            Crear Vendedor
          </button>
        </div>
      </div>
    </div>
  );
}
