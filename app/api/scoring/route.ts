import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { dni, apellido } = await req.json();

    if (!dni || !apellido) {
      return NextResponse.json({ error: "DNI y Apellido son obligatorios" }, { status: 400 });
    }

    let judicialData = { tieneRegistros: false, procesos: [] as any[] };
    let bcraData = null;
    
    // ==========================================
    // 1. SCRAPING: JUS MENDOZA (Apuntando a resultados2.php)
    // ==========================================
    try {
      const formParams = new URLSearchParams();
      // Enviamos el DNI en todos los formatos posibles que suele usar PHP
      formParams.append('nro_doc', dni); 
      formParams.append('documento', dni);
      formParams.append('criterio', dni);
      formParams.append('busqueda', dni);
      formParams.append('buscar', 'Buscar');

      // Le pegamos directo al procesador de resultados
      const mendozaRes = await fetch('https://www2.jus.mendoza.gov.ar/registros/rju/resultados2.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www2.jus.mendoza.gov.ar/registros/rju/index.php'
        },
        body: formParams.toString(),
      });

      const html = await mendozaRes.text();
      const $ = cheerio.load(html);

      // Buscamos las filas de la tabla
      $('table tr').each((i, row) => {
        if (i === 0) return; // Saltar encabezados
        
        const cols = $(row).find('td');
        if (cols.length >= 6) { // La tabla real tiene 6 columnas
          const expediente = $(cols[0]).text().trim();
          const caratula = $(cols[1]).text().trim().toUpperCase(); // Nombre/Razón Social
          const tipoProceso = $(cols[2]).text().trim().toUpperCase(); // Tipo
          const tribunal = $(cols[3]).text().trim().toUpperCase(); // Tribunal
          const fechaInicio = $(cols[4]).text().trim(); // Fecha Inicio
          
          // VERIFICACIÓN DOBLE: Si el Apellido está en la carátula o en los Datos Personales
          if (caratula.includes(apellido.toUpperCase())) {
            judicialData.tieneRegistros = true;
            
            // EXTRACCIÓN DEL LINK
            let linkDocumento = null;
            const aTag = $(row).find('a').first();
            if (aTag.length > 0) {
              const href = aTag.attr('href');
              if (href) {
                linkDocumento = href.startsWith('http') 
                  ? href 
                  : `https://www2.jus.mendoza.gov.ar/registros/rju/${href}`;
              }
            }

            judicialData.procesos.push({
              expediente: expediente,
              caratula: caratula,
              tipo: tipoProceso,
              tribunal: tribunal,
              fechaInicio: fechaInicio,
              linkDocumento: linkDocumento
            });
          }
        }
      });
      
      // LOG PARA VERCEL: Para saber qué nos devuelve realmente si vuelve a fallar
      console.log(`[SCRAPING] DNI: ${dni} | Registros Encontrados: ${judicialData.tieneRegistros}`);

    } catch (error) {
      console.error("Error JUS Mendoza:", error);
    }

    // ==========================================
    // 2. CONSULTA BCRA
    // ==========================================
    try {
      const bcraRes = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1/Deudas/${dni}`);
      if (bcraRes.ok) {
        bcraData = await bcraRes.json();
      }
    } catch (error) {
      console.error("Error BCRA:", error);
    }

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
