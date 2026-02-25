import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import IdleTimerProvider from "@/components/providers/IdleTimerProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IdleTimerProvider>
      <div className="flex h-screen bg-[#050505] overflow-hidden">
        {/* Sidebar Fijo */}
        <Sidebar />
        
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Navbar Superior */}
          <Navbar />
          
          {/* Contenido Dinámico */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none p-4">
            {children}
          </main>
        </div>
      </div>
    </IdleTimerProvider>
  );
}
