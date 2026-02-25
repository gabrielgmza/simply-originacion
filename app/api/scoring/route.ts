import { NextResponse } from "next/server";

// 1. Súper Función: Algoritmo oficial para calcular el CUIL
function calcularCuil(dni: string, sexo: string): string {
    const dniStr = dni.padStart(8, '0');
    let prefijo = sexo === 'M' ? '20' : '27';
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
    let base = prefijo + dniStr;
    let suma = 0;
    for (let i = 0; i < 10; i++) suma += parseInt(base[i]) * multiplicadores[i];
    
    let resto = suma % 11;
    let digito = 11 - resto;
    
    if (digito === 11) digito = 0;
    if (digito === 10) {
        prefijo = '23';
        digito = sexo === 'M' ? 9 : 4;
        base = prefijo + dniStr;
    }
    return base + digito.toString();
}

export async function POST(req: Request) {
    try {
        const { dni, sexo } = await req.json();
        
        if (!dni || !sexo) {
            return NextResponse.json({ error: "Faltan datos de DNI o Sexo" }, { status: 400 });
        }

        const cuil = calcularCuil(dni, sexo);
        console.log(`[SCORING] Consultando CUIL: ${cuil}`);

        // 2. CONSULTA API PÚBLICA BCRA (Sin captchas, sin Puppeteer)
        let bcraData = { tieneDeudas: false, peorSituacion: "1" };
        
        try {
            const resBcra = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1/Deudas/${cuil}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (resBcra.ok) {
                const data = await resBcra.json();
                
                if (data?.results?.deudas && data.results.deudas.length > 0) {
                    bcraData.tieneDeudas = true;
                    const situaciones = data.results.deudas.map((d: any) => parseInt(d.situacion));
                    bcraData.peorSituacion = Math.max(...situaciones).toString();
                }
            } else if (resBcra.status === 404) {
                // 404 en el BCRA significa que no está en la base de deudores (SITUACIÓN 1)
                bcraData.tieneDeudas = false;
            }
        } catch (error) {
            console.error("[SCORING] Error consultando BCRA:", error);
        }

        // 3. RETORNO SEGURO
        return NextResponse.json({
            success: true,
            cuilCalculado: cuil,
            bcra: bcraData,
            judicial: { tieneRegistros: false } 
        });

    } catch (error: any) {
        console.error("[SCORING] Error crítico en servidor:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
