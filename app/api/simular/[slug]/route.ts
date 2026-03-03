// app/api/simular/[slug]/route.ts
// GET: devuelve config pública de la entidad para renderizar la landing
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const snap = await getDocs(
      query(collection(db, "entidades"), where("slug", "==", params.slug))
    );
    if (snap.empty) return NextResponse.json({ error: "Entidad no encontrada" }, { status: 404 });

    const ent = snap.docs[0].data() as any;
    const id  = snap.docs[0].id;

    // Solo exponer datos públicos (nunca credenciales)
    return NextResponse.json({
      id,
      nombre:       ent.nombreFantasia || ent.razonSocial,
      colorPrimario:ent.configuracion?.colorPrimario || "#FF5E14",
      logoUrl:      ent.configuracion?.logoUrl || null,
      simulador: {
        montoMin:   ent.simuladorPublico?.montoMin    || 50000,
        montoMax:   ent.simuladorPublico?.montoMax    || 500000,
        cuotasOpciones: ent.simuladorPublico?.cuotasOpciones || [6, 12, 18, 24],
        tna:        ent.configuracion?.tasaInteresBase || 80,
        gastos:     ent.configuracion?.gastosOtorgamiento || 3,
        seguro:     ent.configuracion?.seguroVidaPorc || 1.5,
      },
      scoring: {
        bcraMaxSituacion:  ent.scoringPublico?.bcraMaxSituacion  ?? 2,
        accionBcraExcedido:ent.scoringPublico?.accionBcraExcedido || "OBSERVADO",
        montoBaseAprobado: ent.scoringPublico?.montoBaseAprobado || 150000,
        mensajeRechazo:    ent.scoringPublico?.mensajeRechazo    || "En este momento no podemos continuar con tu solicitud.",
        mensajeObservado:  ent.scoringPublico?.mensajeObservado  || "Tu solicitud requiere revisión de un asesor.",
        mensajeAprobado:   ent.scoringPublico?.mensajeAprobado   || "¡Felicitaciones! Tenés una pre-aprobación.",
      },
      textos: {
        tagline:    ent.simuladorPublico?.tagline    || "Créditos simples y rápidos",
        subtitulo:  ent.simuladorPublico?.subtitulo  || "Simulá tu crédito sin compromisos",
        beneficios: ent.simuladorPublico?.beneficios || ["Acreditación en 24hs", "Sin garantes", "100% digital"],
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
