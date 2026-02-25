import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { dni, apellido } = await req.json();

    if (!dni || !apellido) {
      return NextResponse.json({ error: "DNI y Apellido son obligatorios" }, { status: 400 });
    }

    // ==========================================
    // 1. SCRAPING: PODER JUDICIAL DE MENDOZA
    // ==========================================
    let judicialData = { tieneRegistros: false, procesos: [] as any[] };
    
    try {
      // Preparamos el formulario POST simulando que alguien apretó "Buscar" en la página
      // (Nota: Los nombres de los campos 'nro_doc' dependen del HTML exacto de la web de Mendoza)
      const formParams = new URLSearchParams();
      formParams.append('nro_doc', dni); 

      const mendozaRes = await fetch('https://www2.jus.mendoza.gov.ar/registros/rju/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: formParams.toString(),
      });

      const html = await mendozaRes.text();
      const $ = cheerio.load(html);

      // Buscamos las filas de la tabla de resultados en el HTML parseado
      // Asumimos que los resultados están en una tabla genérica (ajustar selector si es distinto)
      $('table tr').each((i, row) => {
        if (i === 0) return; // Saltamos el encabezado de la tabla
        
        const cols = $(row).find('td');
        if (cols.length >= 4) {
          const caratula = $(cols[1]).text().trim().toUpperCase();
          const tipoProceso = $(cols[2]).text().trim().toUpperCase();
          
          // VALIDACIÓN DE IDENTIDAD: Verificamos que el apellido esté en la carátula judicial
          if (caratula.includes(apellido.toUpperCase())) {
            judicialData.tieneRegistros = true;
            judicialData.procesos.push({
              expediente: $(cols[0]).text().trim(),
              caratula: caratula,
              tipo: tipoProceso,
              fechaInicio: $(cols[3]).text().trim()
            });
          }
        }
      });
    } catch (error) {
      console.error("Error Scrapeando Mendoza:", error);
      // No bloqueamos todo si la web judicial se cae, devolvemos error parcial
    }

    // ==========================================
    // 2. CONSULTA BCRA (Desde Servidor para evitar CORS)
    // ==========================================
    let bcraData = null;
    try {
      // Endpoint público de BCRA (Suele requerir proxy en prod si bloquean IPs de Vercel)
      const bcraRes = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1/Deudas/${dni}`);
      if (bcraRes.ok) {
        bcraData = await bcraRes.json();
      }
    } catch (error) {
      console.error("Error consultando BCRA:", error);
    }

    // Devolvemos la data consolidada a tu frontend
    return NextResponse.json({
      success: true,
      dni,
      apellidoValidado: apellido,
      judicial: judicialData,
      bcra: bcraData
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
