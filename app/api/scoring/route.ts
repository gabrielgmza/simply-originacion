import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Algoritmo para adivinar el CUIL válido a partir de un DNI
function generarCuiles(dni: string): string[] {
  const prefijos = ['20', '27', '23', '24'];
  const cuiles: string[] = [];
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  prefijos.forEach(prefijo => {
    const base = prefijo + dni.padStart(8, '0');
    let suma = 0;
    for (let i = 0; i < 10; i++) { suma += parseInt(base[i]) * multiplicadores[i]; }
    const mod = suma % 11;
    let digito;
    if (mod === 0) digito = 0;
    else if (mod === 1) { if (prefijo === '20' || prefijo === '27') return; digito = 9; } 
    else { digito = 11 - mod; }
    cuiles.push(base + digito.toString());
  });
  return cuiles;
}

export async function POST(req: Request) {
  try {
    const { dni, apellido } = await req.json();
    if (!dni || !apellido) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    let judicialData = { tieneRegistros: false, procesos: [] as any[] };
    let bcraData = { tieneDeudas: false, peorSituacion: 1, totalDeuda: 0, entidades: [] as any[] };
    
    // ==========================================
    // 1. SCRAPING: JUS MENDOZA (Intacto y funcionando)
    // ==========================================
    try {
      const formParams = new URLSearchParams();
      formParams.append('nro_doc', dni); formParams.append('documento', dni); formParams.append('criterio', dni); formParams.append('busqueda', dni); formParams.append('buscar', 'Buscar');

      const mendozaRes = await fetch('https://www2.jus.mendoza.gov.ar/registros/rju/resultados2.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
        body: formParams.toString(),
      });
      const html = await mendozaRes.text();
      const $ = cheerio.load(html);

      $('table tr').each((i, row) => {
        if (i === 0) return;
        const cols = $(row).find('td');
        if (cols.length >= 6) {
          const caratula = $(cols[1]).text().trim().toUpperCase();
          if (caratula.includes(apellido.toUpperCase())) {
            judicialData.tieneRegistros = true;
            let linkDocumento = null;
            const href = $(row).find('a').first().attr('href');
            if (href) linkDocumento = href.startsWith('http') ? href : `https://www2.jus.mendoza.gov.ar/registros/rju/${href}`;
            
            judicialData.procesos.push({
              expediente: $(cols[0]).text().trim(), caratula: caratula, tipo: $(cols[2]).text().trim().toUpperCase(),
              tribunal: $(cols[3]).text().trim().toUpperCase(), fechaInicio: $(cols[4]).text().trim(), linkDocumento
            });
          }
        }
      });
    } catch (e) { console.error("Error Mendoza:", e); }

    // ==========================================
    // 2. CONSULTA BCRA (Motor v1.0 con Auto-CUIL)
    // ==========================================
    try {
      const cuiles = generarCuiles(dni);
      let bcraResData = null;

      // Probamos los 2 o 3 CUIL posibles hasta que la API nos de luz verde
      for (const cuil of cuiles) {
        const res = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`);
        if (res.status === 200) {
          const json = await res.json();
          if (json.status === 0 && json.results) { bcraResData = json.results; break; }
        }
      }

      if (bcraResData && bcraResData.periodos && bcraResData.periodos.length > 0) {
        bcraData.tieneDeudas = true;
        const ultimoPeriodo = bcraResData.periodos[0]; // Tomamos el mes más actual
        
        let maxSit = 1;
        let total = 0;
        
        ultimoPeriodo.entidades.forEach((ent: any) => {
          if (ent.situacion > maxSit) maxSit = ent.situacion;
          total += ent.monto; // El BCRA devuelve el monto en miles de pesos
          bcraData.entidades.push({ nombre: ent.entidad, situacion: ent.situacion, monto: ent.monto });
        });
        bcraData.peorSituacion = maxSit;
        bcraData.totalDeuda = total;
      }
    } catch (e) { console.error("Error BCRA:", e); }

    return NextResponse.json({ success: true, dni, apellidoValidado: apellido, judicial: judicialData, bcra: bcraData });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
