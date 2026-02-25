import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  // Esta clave se define en las variables de entorno de Vercel
  if (auth !== `Bearer ${process.env.API_SECRET_CORE}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ 
    status: "Simply Originacion Bridge Online", 
    version: "7.2.0",
    timestamp: new Date().toISOString()
  });
}
