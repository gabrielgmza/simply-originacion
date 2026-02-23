import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dni } = body;

    if (!dni || dni.length < 7) {
      return NextResponse.json({ error: 'DNI inválido' }, { status: 400 });
    }

    // Simulamos el tiempo que tarda en ir a la base de datos del BCRA
    await new Promise((resolve) => setTimeout(resolve, 1800));

    // Lógica inteligente para simular distintos historiales crediticios:
    // Si el DNI termina en 8 o 9, simulamos que es un cliente deudor.
    const ultimoDigito = dni.slice(-1);
    
    let bcraResponse = {
      situacion: 1,
      descripcion: 'Normal',
      entidades: ['BANCO GALICIA', 'TARJETA NARANJA'],
      deudaTotal: 150000,
      apto: true
    };

    if (ultimoDigito === '8') {
      bcraResponse = {
        situacion: 3,
        descripcion: 'Riesgo Medio',
        entidades: ['BANCO MACRO'],
        deudaTotal: 450000,
        apto: false
      };
    } else if (ultimoDigito === '9') {
      bcraResponse = {
        situacion: 5,
        descripcion: 'Irrecuperable',
        entidades: ['MERCADO LIBRE SRL', 'BANCO SANTANDER'],
        deudaTotal: 1200000,
        apto: false
      };
    }

    return NextResponse.json({ success: true, data: bcraResponse });

  } catch (error) {
    console.error('[BCRA API] Error:', error);
    return NextResponse.json({ error: 'Fallo al conectar con BCRA' }, { status: 500 });
  }
}
