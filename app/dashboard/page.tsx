"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function DashboardIndex() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!userData) {
        router.push("/login");
      } else {
        switch (userData.rol) {
          case "MASTER_PAYSUR":
            router.push("/admin");
            break;
          case "GERENTE_GENERAL":
          case "GERENTE_SUCURSAL":
            router.push("/dashboard/gerencia");
            break;
          case "VENDEDOR":
            router.push("/dashboard/originacion");
            break;
          case "LIQUIDADOR":
            router.push("/dashboard/operaciones");
            break;
          default:
            router.push("/login");
        }
      }
    }
  }, [userData, loading, router]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#FF5E14]">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p className="text-gray-400 font-medium">Redirigiendo a tu panel...</p>
    </div>
  );
}
