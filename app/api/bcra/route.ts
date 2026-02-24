import { NextResponse } from 'next/server';

// Función matemática para descifrar CUITs a partir de un DNI
function getValidCuits(dniStr: string) {
  const prefixes = ['20', '27', '23', '24'];
  const cuits: string[] = [];
  const d = dniStr.padStart(8, '0');
  
  prefixes.forEach(pref => {
    const base = pref + d;
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(base[i]) * multipliers[i];
    let rem = sum % 11;
    let v = rem === 0 ? 0 : 11 - rem;
    
    if (v !== 10) {
        cuits.push(base + v);
    } else {
      if (pref === '20') cuits.push('23' + d + '9');
      if (pref === '27') cuits.push('23' + d + '4');
    }
  });
  return [...new Set(cuits)];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dni } = body;

    if (!dni || dni.length < 7) {
      return NextResponse.json({ error: 'DNI inválido' }, { status: 400 });
    }

    console.log(`[BCRA API DIRECTA] Iniciando búsqueda para DNI: ${dni}`);
    const cuits = getValidCuits(dni);
    let bcraData: any = null;
    let personaFound = false;

    // 1. Conexión directa a la API oficial del BCRA
    for (const cuit of cuits) {
      try {
        const response = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1/Deudas/${cuit}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Simulamos ser un navegador para evitar bloqueos
          }
        });

        if (response.status === 200) {
          const data = await response.json();
          if (data.results && data.results.denominacion) {
            bcraData = data.results;
            personaFound = true;
            console.log(`[BCRA API] CUIT Encontrado: ${cuit}`);
            break; // Si lo encuentra, dejamos de probar otros CUITs
          }
        }
      } catch (e) {
        console.warn(`[BCRA API] Intento fallido de red con CUIT ${cuit}`);
      }
    }

    // 2. Procesamiento de la información oficial
    let situacion = 1;
    let descripcion = 'Normal (Sin Historial en BCRA)';
    let entidades: string[] = ['Sin deudas bancarias registradas'];
    let deudaTotal = 0;
    let apto = true;

    if (personaFound && bcraData) {
        if (bcraData.entidades && bcraData.entidades.length > 0) {
            let peorSituacion = 1;
            entidades = [];
            
            // Sumamos todas las deudas y buscamos la peor situación crediticia
            bcraData.entidades.forEach((ent: any) => {
                if (ent.situacion > peorSituacion) peorSituacion = ent.situacion;
                // El BCRA manda montos en miles. Multiplicamos por 1000 para el valor real.
                deudaTotal += (ent.monto * 1000); 
                entidades.push(ent.entidad);
            });

            situacion = peorSituacion;

            const descripciones: Record<number, string> = {
                1: 'Normal',
                2: 'Riesgo Bajo',
                3: 'Riesgo Medio',
                4: 'Alto Riesgo',
                5: 'Irrecuperable',
                6: 'Irrecuperable (Técnica)'
            };
            
            descripcion = descripciones[situacion] || 'Desconocida';
            entidades = [...new Set(entidades)]; // Filtramos bancos repetidos
            apto = situacion <= 2; // Política: Solo aprobamos Situación 1 y 2
        } else {
            descripcion = 'Normal (Sin deudas activas)';
        }
    }

    // 3. Devolvemos la data limpia al frontend
    return NextResponse.json({ 
        success: true, 
        data: { situacion, descripcion, entidades, deudaTotal, apto } 
    });

  } catch (error) {
    console.error('[BCRA API] Error general:', error);
    return NextResponse.json({ error: 'Fallo de conexión con el servidor del BCRA' }, { status: 500 });
  }
}
