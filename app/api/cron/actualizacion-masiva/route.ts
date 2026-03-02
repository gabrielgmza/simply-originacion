import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // 1. SEGURIDAD: Verificamos que esta ruta solo pueda ser llamada por Vercel
        const authHeader = request.headers.get('authorization');
        if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        console.log("🚀 Iniciando barrido masivo de cartera activa...");

        // 2. SIMULACIÓN DE BASE DE DATOS (Acá iría tu "await db.prestamos.findMany(...)")
        // Traemos todos los préstamos que están "ACTIVOS" y evaluamos su situación
        const prestamosActivos = [
            { id: "P-001", cliente: "Juan Perez", cuotaMensual: 50000, diasAtraso: 0, tasaMora: 0.15 },  // Al día
            { id: "P-002", cliente: "Maria Gomez", cuotaMensual: 30000, diasAtraso: 5, tasaMora: 0.15 }, // 5 días de atraso
            { id: "P-003", cliente: "Carlos Ruiz", cuotaMensual: 80000, diasAtraso: 45, tasaMora: 0.15 } // 45 días de atraso
        ];

        let creditosActualizados = 0;
        let registroCambios = [];

        // 3. LÓGICA DE CÁLCULO DE PUNITORIOS
        for (const prestamo of prestamosActivos) {
            if (prestamo.diasAtraso > 0) {
                // Si tiene atraso, le calculamos la mora. 
                // Ejemplo: +15% de punitorios sobre la cuota base por estar vencido
                const punitorios = prestamo.cuotaMensual * prestamo.tasaMora;
                const deudaTotalActualizada = prestamo.cuotaMensual + punitorios;

                // Acá iría tu actualización en DB: "await db.prestamos.update({ ... })"
                
                registroCambios.push({
                    id: prestamo.id,
                    cliente: prestamo.cliente,
                    atraso: prestamo.diasAtraso,
                    cuotaOriginal: prestamo.cuotaMensual,
                    punitoriosAplicados: punitorios,
                    nuevoSaldo: deudaTotalActualizada
                });

                creditosActualizados++;
            }
        }

        console.log(`✅ Barrido completado. ${creditosActualizados} créditos pasaron a mora.`);

        // 4. RESPUESTA DEL SCRIPT
        return NextResponse.json({
            success: true,
            mensaje: `Barrido nocturno finalizado con éxito`,
            estadisticas: {
                totalAnalizados: prestamosActivos.length,
                pasadosAMora: creditosActualizados,
                detalles: registroCambios
            }
        });

    } catch (error: any) {
        console.error("❌ Error en el barrido masivo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
