import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";

export async function POST(req: Request) {
  const { dni } = await req.json();
  
  // Lógica para JUICIOS (Mendoza)
  // ... (aquí va tu código de navegación hasta la tabla de juicios)
  
  const tieneRegistrosReales = await page.evaluate(() => {
    const filas = Array.from(document.querySelectorAll('table tr'));
    return filas.some(fila => {
      const texto = (fila as HTMLElement).innerText.toUpperCase();
      // Solo es positivo si dice literalmente QUIEBRA o CONCURSO 
      // y NO dice "no se encontraron"
      return (texto.includes("QUIEBRA") || texto.includes("CONCURSO")) && 
             !texto.includes("NO SE ENCONTRARON") &&
             !texto.includes("CERO REGISTROS");
    });
  });

  return NextResponse.json({ 
    judicial: { tieneRegistros: tieneRegistrosReales } 
  });
}
