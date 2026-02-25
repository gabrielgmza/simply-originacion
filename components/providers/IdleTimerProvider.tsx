"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IdleTimerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  useEffect(() => {
    // 30 minutos de inactividad por defecto
    const TIMEOUT = 30 * 60 * 1000; 
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Lógica de logout por seguridad bancaria
        console.log("Sesión caducada");
        router.push("/auth/login");
      }, TIMEOUT);
    };

    // Escuchar actividad del empleado
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keypress", resetTimer);
    window.addEventListener("scroll", resetTimer);
    window.addEventListener("click", resetTimer);

    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keypress", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      window.removeEventListener("click", resetTimer);
      clearTimeout(timer);
    };
  }, [router]);

  return <>{children}</>;
}
