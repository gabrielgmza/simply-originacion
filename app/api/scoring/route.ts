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
    if (digito === 10) {
        prefijo = '23';
        digito = sexo === 'M' ? 9 : 4;
        base = prefijo + dniStr;
    }
    return base + digito.toString();
}

export async function POST(req: Request) {
    try {
        const { documento, sexo } = await req.json();
        const docLimpio = documento.replace(/[^0-9]/g, '');
        const cuil = docLimpio.length >= 10 ? docLimpio : calcularCuil(docLimpio, sexo);

        let bcraData = { error: false, tieneDeudas: false, peorSituacion: "1", nombre: "", cuil: cuil, detalles: [] };
        
        try {
            const resBcra = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1/Deudas/${cuil}`, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
            });

            if (resBcra.ok) {
                const data = await resBcra.json();
                if(data?.results) {
                    bcraData.nombre = data.results.denominacion || "";
                    if (data.results.deudas && data.results.deudas.length > 0) {
                        bcraData.tieneDeudas = true;
                        bcraData.detalles = data.results.deudas; // Guardamos deudas para el Modal
                        const situaciones = data.results.deudas.map((d: any) => parseInt(d.situacion));
                        bcraData.peorSituacion = Math.max(...situaciones).toString();
                    }
                }
            } else if (resBcra.status === 404) {
                // 404 real: Limpio
                bcraData.tieneDeudas = false;
            } else {
                bcraData.error = true;
            }
        } catch (error) {
            bcraData.error = true;
        }

        return NextResponse.json({ success: true, bcra: bcraData });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: true });
    }
}
