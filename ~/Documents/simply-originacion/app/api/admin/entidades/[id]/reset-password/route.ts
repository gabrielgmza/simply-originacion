import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params;
    const { email, password } = await req.json();
    if (!email || !password || password.length < 6)
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[reset-password]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
