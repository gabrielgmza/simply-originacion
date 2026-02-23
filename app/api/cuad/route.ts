import { NextResponse } from 'next/server';

// Esta función se ejecuta en los servidores de Vercel, NO en el navegador del usuario.
// Aquí es donde en el futuro irá el código real de Puppeteer/Scraping al Gobierno.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dni } = body;

    if (!dni || dni.length < 7) {
      return NextResponse.json({ error: 'DNI inválido' }, { status: 400 });
    }

    // --- AQUÍ IRÁ LA LÓGICA DEL SCRAPER REAL EN EL FUTURO ---
    console.log(`[BACKEND] Iniciando scraping en CUAD para DNI: ${dni}...`);
    
    // Simulamos el tiempo de respuesta del servidor del gobierno (2.5 segundos)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Base de datos de prueba falsa para que veas cómo responde dinámicamente
    let responseData = {
      nombre: 'JUAN PABLO PEREZ',
      reparticion: 'DGE - DOCENTES TITULARES',
      sueldoNeto: 850000,
      margenAfectable: 170000,
      score: 'Apto'
    };

    // Si termina en 0, lo hacemos rebotar para simular un rechazo
    if (dni.endsWith('0')) {
       responseData = {
         nombre: 'MARIA LAURA GOMEZ',
         reparticion: 'MINISTERIO DE SALUD',
         sueldoNeto: 450000,
         margenAfectable: 15000, // Margen muy bajo
         score: 'Apto con reservas'
       };
    }

    // Devolvemos los datos al frontend
    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error('[BACKEND] Error en scraper CUAD:', error);
    return NextResponse.json({ error: 'Fallo al conectar con el servidor gubernamental' }, { status: 500 });
  }
}
