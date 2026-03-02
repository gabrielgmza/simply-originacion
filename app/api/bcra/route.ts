import { NextResponse } from "next/server";

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
    if (digito === 10) { prefijo = '23'; digito = sexo === 'M' ? 9 : 4; base = prefijo + dniStr; }
    return base + digito.toString();
}

export async function POST(req: Request) {
    try {
        const { documento, sexo } = await req.json();
        const docLimpio = documento.replace(/[^0-9]/g, '');
        const cuil = docLimpio.length >= 10 ? docLimpio : calcularCuil(docLimpio, sexo);
        
        console.log(`[BCRA DIRECTO] Consultando CUIL: ${cuil}`);

        // Consulta directa desde el servidor de Vercel a la nueva API
        const response = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`, {
            method: 'GET',
            headers: { 
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            cache: 'no-store' // CRÍTICO: Evita que Vercel devuelva un error viejo guardado en memoria
        });

        if (response.ok) {
            const data = await response.json();
            let bcraData = { error: false, tieneDeudas: false, peorSituacion: "1", nombre: "", cuil: cuil, detalles: [] };
            
            if (data.results) {
                bcraData.nombre = data.results.denominacion || "";
                
                // Mapeo de la nueva estructura v1.0
                if (data.results.periodos && data.results.periodos.length > 0) {
                    const ultimoPeriodo = data.results.periodos[0];
                    if (ultimoPeriodo.entidades && ultimoPeriodo.entidades.length > 0) {
                        bcraData.tieneDeudas = true;
                        bcraData.detalles = ultimoPeriodo.entidades.map((ent: any) => ({
                            entidad: ent.entidad,
                            situacion: ent.situacion.toString(),
                            monto: ent.monto,
                            periodo: ultimoPeriodo.periodo
                        }));
                        const situaciones = ultimoPeriodo.entidades.map((d: any) => parseInt(d.situacion));
                        bcraData.peorSituacion = Math.max(...situaciones).toString();
                    }
                }
            }
            return NextResponse.json({ success: true, bcra: bcraData });
        } else if (response.status === 404) {
            // El 404 de esta API significa "No tiene deudas", está Limpio.
            return NextResponse.json({ success: true, bcra: { error: false, tieneDeudas: false, peorSituacion: "1", cuil } });
        } else {
            return NextResponse.json({ success: false, error: true, mensaje: `El Gobierno devolvió HTTP ${response.status}` }, { status: 200 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: true, mensaje: error.message }, { status: 200 });
    }
}
