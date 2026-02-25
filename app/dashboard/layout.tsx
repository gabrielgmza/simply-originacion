import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#050505]">
      {/* Sidebar con ancho fijo, NO fixed para que ocupe su espacio real */}
      <Sidebar />
      
      {/* Contenido con scroll independiente y margen correcto */}
      <main className="flex-1 overflow-y-auto bg-[#050505] relative">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
