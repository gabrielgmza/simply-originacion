"use client";
import { useState, useEffect } from "react";
import { BarChart3, PieChart, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function ContabilidadPage() {
  return (
    <div className="p-10 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white italic mb-10">Módulo Contable y Conciliación</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-gray-500 uppercase">Venta Bruta Mensual</p>
          <p className="text-3xl font-black text-white mt-2">$2.450.000</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-blue-500 uppercase">Comisiones Simply (Neto)</p>
          <p className="text-3xl font-black text-blue-400 mt-2">$61.250</p>
        </div>
        <div className="bg-[#0A0A0A] border border-gray-800 p-8 rounded-[40px]">
          <p className="text-[10px] font-black text-green-500 uppercase">Fondeo Disponible</p>
          <p className="text-3xl font-black text-green-500 mt-2">$1.800.000</p>
        </div>
      </div>
      <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-2xl font-black">
        <Download size={18}/> Exportar Conciliación (.xlsx)
      </button>
    </div>
  );
}
