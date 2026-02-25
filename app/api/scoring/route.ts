import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Algoritmo Matemático Exacto (Módulo 11 AFIP/ANSES)
function calcularCuilExacto(dni: string, sexo: string): string {
  let prefijo = sexo === 'M' ? '20' : '27';
  const dniStr = dni.padStart(8, '0');
  let base = prefijo + dniStr;

  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  
  let suma = 0;
  for (let i = 0; i < 10; i++) { suma += parseInt(base[i]) * multiplicadores[i]; }
  
  const mod = suma % 11;
  let z;
  
  if (mod === 0) {
    z = 0;
  } else if (mod === 1) {
    // Resolución de colisión (Cambia a prefijo 23)
    prefijo = '23';
    base = prefijo + dniStr;
    z = sexo === 'M' ? 9 : 4;
  } else {
    z = 11 - mod;
  }
  
  return base + z.toString();
}

export async function POST(req: Request) {
  try {
    const { dni, sexo } = await req.json();

    if (!dni || !sexo) {
      return NextResponse.json({ error: "DNI y Sexo son obligatorios" }, { status: 400 });
    }

    const cuilExacto = calcularCuilExacto(dni, sexo);
    
    let judicialData = { tieneRegistros: false, procesos: [] as any[] };
    let bcraData = { tieneDeudas: false, peorSituacion: 1, totalDeuda: 0, entidades: [] as any[] };
    let cuilValidado = cuilExacto;

    // ==========================================
    // 1. SCRAPING: JUS MENDOZA (Solo por DNI)
    // ==========================================
    try {
      const formParams = new URLSearchParams();
      formParams.append('nro_doc', dni); 
      formParams.append('documento', dni); 
      formParams.append('criterio', dni); 
      formParams.append('busqueda', dni); 
      formParams.append('buscar', 'Buscar');

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
          judicialData.tieneRegistros = true;
          let linkDocumento = null;
          const href = $(row).find('a').first().attr('href');
          if (href) linkDocumento = href.startsWith('http') ? href : `https://www2.jus.mendoza.gov.ar/registros/rju/${href}`;
          
          judicialData.procesos.push({
            expediente: $(cols[0]).text().trim(),
            caratula: $(cols[1]).text().trim().toUpperCase(),
            tipo: $(cols[2]).text().trim().toUpperCase(),
            tribunal: $(cols[3]).text().trim().toUpperCase(),
            fechaInicio: $(cols[4]).text().trim(),
            linkDocumento: linkDocumento
          });
        }
      });
    } catch (e) { console.error("Error Mendoza:", e); }

    // ==========================================
    // 2. CONSULTA BCRA (Con CUIL Exacto)
    // ==========================================
    try {
      const res = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuilExacto}`);
      if (res.status === 200) {
        const json = await res.json();
        if (json.status === 0 && json.results && json.results.periodos && json.results.periodos.length > 0) {
          bcraData.tieneDeudas = true;
          const ultimoPeriodo = json.results.periodos[0];
          
          let maxSit = 1;
          let total = 0;
          
          ultimoPeriodo.entidades.forEach((ent: any) => {
            if (ent.situacion > maxSit) maxSit = ent.situacion;
            total += ent.monto;
            bcraData.entidades.push({ nombre: ent.entidad, situacion: ent.situacion, monto: ent.monto });
          });
          bcraData.peorSituacion = maxSit;
          bcraData.totalDeuda = total;
        }
      }
    } catch (e) { console.error("Error BCRA:", e); }

    return NextResponse.json({ 
      success: true, 
      dni, 
      cuilValidado, 
      judicial: judicialData, 
      bcra: bcraData 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
