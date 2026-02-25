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
    // 1. SCRAPING: JUS MENDOZA (Con Extracción de Link)
    // ==========================================
    try {
      const formParams = new URLSearchParams();
      formParams.append('nro_doc', dni); 

      const mendozaRes = await fetch('https://www2.jus.mendoza.gov.ar/registros/rju/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: formParams.toString(),
      });

      const html = await mendozaRes.text();
      const $ = cheerio.load(html);

      $('table tr').each((i, row) => {
        if (i === 0) return; // Saltar encabezados
        
        const cols = $(row).find('td');
        if (cols.length >= 4) {
          const caratula = $(cols[1]).text().trim().toUpperCase();
          const tipoProceso = $(cols[2]).text().trim().toUpperCase();
          
          // VERIFICACIÓN DOBLE: DNI (enviado en el form) + Apellido (en la carátula)
          if (caratula.includes(apellido.toUpperCase())) {
            judicialData.tieneRegistros = true;
            
            // EXTRACCIÓN DEL LINK DEL DOCUMENTO
            let linkDocumento = null;
            const aTag = $(row).find('a').first(); // Buscamos la etiqueta <a> en la fila
            
            if (aTag.length > 0) {
              const href = aTag.attr('href');
              if (href) {
                // Si el link es relativo (ej: controlador.php?...), lo hacemos absoluto
                linkDocumento = href.startsWith('http') 
                  ? href 
                  : `https://www2.jus.mendoza.gov.ar/registros/rju/${href}`;
              }
            }

            judicialData.procesos.push({
              expediente: $(cols[0]).text().trim(),
              caratula: caratula,
              tipo: tipoProceso,
              fechaInicio: $(cols[3]).text().trim(),
              linkDocumento: linkDocumento // Guardamos el link extraído
            });
          }
        }
      });
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
