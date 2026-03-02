import { NextResponse } from "next/server";
import https from "https";

// 1. Calculadora de CUIL (Directo como me pediste)
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

// 2. Conector de Bajo Nivel (Evita el bloqueo SSL del Gobierno)
function fetchBcraApi(cuil: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bcra.gob.ar',
            port: 443,
            path: `/CentralDeDeudores/v1.0/Deudas/${cuil}`,
            method: 'GET',
            rejectUnauthorized: false, // LA CLAVE: Ignora los certificados rotos del gobierno
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
                } catch (e) {
                    resolve({ status: res.statusCode, data: null });
                }
            });
        });

        req.on('error', (e) => reject(e));
        
        // Si el gobierno se cuelga por más de 10 segundos, cortamos
        req.setTimeout(10000, () => { 
            req.destroy(); 
            reject(new Error("Timeout conectando al BCRA")); 
        });
        req.end();
    });
}

// 3. Ejecución de la ruta en Vercel
export async function POST(req: Request) {
    try {
        const { documento, sexo } = await req.json();
        const docLimpio = documento.replace(/[^0-9]/g, '');
        const cuil = docLimpio.length >= 10 ? docLimpio : calcularCuil(docLimpio, sexo);
        
        console.log(`[BCRA DIRECTO HTTPS] Consultando CUIL: ${cuil}`);

        const response = await fetchBcraApi(cuil);

        if (response.status === 200) {
            const data = response.data;
            let bcraData = { error: false, tieneDeudas: false, peorSituacion: "1", nombre: "", cuil: cuil, detalles: [] };
            
            if (data && data.results) {
                bcraData.nombre = data.results.denominacion || "";
                
                // Leemos el array de "periodos" que figura en el PDF
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
            // Un 404 en el PDF del gobierno significa que NO HAY DEUDAS (Está limpio)
            return NextResponse.json({ success: true, bcra: { error: false, tieneDeudas: false, peorSituacion: "1", cuil } });
        } else {
            console.log(`[BCRA] El Gobierno falló con status HTTP: ${response.status}`);
            return NextResponse.json({ success: false, error: true, mensaje: `Servidor BCRA devolvió error ${response.status}` }, { status: 200 });
        }
    } catch (error: any) {
        console.log(`[BCRA] Error de conexión forzada: ${error.message}`);
        return NextResponse.json({ success: false, error: true, mensaje: `Falla de conexión: ${error.message}` }, { status: 200 });
    }
}
