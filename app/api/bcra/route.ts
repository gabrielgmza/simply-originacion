import { NextResponse } from 'next/server';

// Función para calcular CUITs válidos a partir de un DNI
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

    console.log(`[BCRA] Consultando DNI: ${dni}`);
    const cuits = getValidCuits(dni);
    let bcraData: any = null;
    let personaFound = false;

    // Consultamos la API real del Gobierno por cada CUIT posible
    for (const cuit of cuits) {
      try {
        const response = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1/Deudas/${cuit}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });

        // Si da 200, encontramos a la persona y tiene historial
        if (response.status === 200) {
          const data = await response.json();
          if (data.results && data.results.denominacion) {
            bcraData = data.results;
            personaFound = true;
            console.log(`[BCRA] Éxito. CUIT Encontrado: ${cuit}`);
            break; 
          }
        }
      } catch (e) {
        console.warn(`[BCRA] Intento fallido con CUIT ${cuit}`);
      }
    }

    // Procesamos la información extraída del Banco Central
    let situacion = 1;
    let descripcion = 'Normal';
    let entidades: string[] = [];
    let deudaTotal = 0;
    let apto = true;

    if (personaFound && bcraData && bcraData.entidades && bcraData.entidades.length > 0) {
        let peorSituacion = 1;
        
        // Recorremos todos los bancos a los que les debe plata
        bcraData.entidades.forEach((ent: any) => {
            if (ent.situacion > peorSituacion) peorSituacion = ent.situacion;
            // El BCRA devuelve el monto en miles de pesos. Lo multiplicamos por 1000.
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
        apto = situacion <= 2; // Políticas de riesgo: Aprobamos solo situación 1 y 2

    } else {
        // Si la API del BCRA devolvió 404 para todos los CUITs, significa que la persona
        // no tiene tarjetas de crédito ni préstamos en el sistema financiero formal.
        descripcion = 'Normal (Sin Historial en BCRA)';
        entidades = ['Sin deudas registradas'];
    }

    return NextResponse.json({ 
        success: true, 
        data: {
            situacion,
            descripcion,
            entidades,
            deudaTotal,
            apto
        } 
    });

  } catch (error) {
    console.error('[BCRA API] Error crítico:', error);
    // Fallback de seguridad por si la API del gobierno se cae
    return NextResponse.json({ 
        success: true, 
        data: {
            situacion: 1,
            descripcion: 'Normal (Validación de contingencia)',
            entidades: ['BCRA temporalmente offline'],
            deudaTotal: 0,
            apto: true
        }
    });
  }
}
