"use client";
import { useState, useEffect } from "react";
// ... (mismos imports anteriores)

export default function BuscadorScoringReal({ entidadConfig }) {
  // entidadConfig vendría de tu base de datos (ej: { checkMendoza: true, fee: 50 })
  const [dni, setDni] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [botStatus, setBotStatus] = useState("idle");

  const consultarTodo = async () => {
    setLoading(true);
    setBotStatus("procesando");

    // 1. Scoring normal (Siempre se hace)
    const resScoring = await fetch('/api/scoring', { /* ... */ });
    const dataScoring = await resScoring.json();
    setResultado(dataScoring);

    // 2. ¿Tiene permiso para Mendoza?
    if (entidadConfig?.checkMendoza) {
      try {
        const resBot = await fetch('https://simply-bot-mendoza-97321115506.us-central1.run.app/api/simular-cupo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dni, usuario: "Amarque", password: "uni66" })
        });
        const dataBot = await resBot.json();

        if (dataBot.noRegistra) {
          setBotStatus("no_empleado");
        } else if (dataBot.success) {
          setResultado(prev => ({ ...prev, cupoReal: dataBot.cupoMaximo }));
          setBotStatus("completado");
          // AQUÍ: Registrar el cobro del Fee en tu DB
          registrarCobroFee(entidadConfig.id, entidadConfig.feeConsultaMendoza);
        }
      } catch (e) { setBotStatus("error"); }
    } else {
      setBotStatus("desactivado");
    }
    setLoading(false);
  };

  return (
    // ... UI que muestra "No es empleado público" si botStatus === "no_empleado"
  );
}
