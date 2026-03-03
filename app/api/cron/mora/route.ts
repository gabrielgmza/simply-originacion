import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, query, where, getDocs, doc,
  getDoc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";

// ── Seguridad: solo Vercel Cron puede llamar esto ────────────────────────────
export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let totalProcesadas = 0;
  let totalNuevasMora = 0;
  let totalWA        = 0;
  let errores        = 0;

  try {
    // 1. Obtener todas las entidades con el módulo de mora activo
    const entSnap = await getDocs(
      query(collection(db, "entidades"),
        where("activa", "!=", false))
    );

    for (const entDoc of entSnap.docs) {
      const entidad = { id: entDoc.id, ...entDoc.data() } as any;
      const cfg = entidad.configuracion || {};
      const moraCfg = cfg.mora || {};

      // Si la entidad desactivó el cron, saltear
      if (moraCfg.cronActivo === false) continue;

      // Parámetros de la entidad (con defaults)
      const diasGracia          = moraCfg.diasGracia          ?? 3;
      const tasaPunitoriaDiaria = moraCfg.tasaPunitoriaDiaria  ?? 0.12; // %
      const tasaMoratoriaDiaria = moraCfg.tasaMoratoriaDiaria  ?? 0.033; // %
      const aplicarPunitorio    = moraCfg.aplicarPunitorio     ?? true;
      const aplicarMoratorio    = moraCfg.aplicarMoratorio     ?? true;
      const notificarWA         = moraCfg.notificarWhatsapp    ?? true;
      const diasNotifWA         = moraCfg.diasNotifWA          ?? [1, 5, 15];

      // 2. Operaciones liquidadas de esta entidad que no estén finalizadas ni rechazadas
      const opsSnap = await getDocs(
        query(collection(db, "operaciones"),
          where("entidadId",  "==", entidad.id),
          where("estado", "not-in", ["RECHAZADO", "FINALIZADO", "PENDIENTE_APROBACION", "EN_REVISION"]))
      );

      for (const opDoc of opsSnap.docs) {
        try {
          const op = { id: opDoc.id, ...opDoc.data() } as any;

          // Determinar la fecha de vencimiento real
          // Usamos la fecha de vencimiento de la cuota más antigua no pagada
          const fechaLiq = op.fechaLiquidacion?.toDate?.() || null;
          if (!fechaLiq) continue;

          const valorCuota  = op.financiero?.valorCuota  || 0;
          const totalCuotas = op.financiero?.cuotas       || 0;
          const monto       = op.financiero?.montoSolicitado || 0;

          // Calcular cuotas pagadas
          const pagosSnap = await getDocs(
            query(collection(db, "pagos"),
              where("operacionId", "==", op.id),
              where("tipo", "!=", "DEVOLUCION"))
          );
          const totalPagado = pagosSnap.docs.reduce((a, p) => a + (p.data().monto || 0), 0);
          const cuotasPagadas = valorCuota > 0 ? Math.floor(totalPagado / valorCuota) : 0;

          if (cuotasPagadas >= totalCuotas) {
            // Crédito cancelado → finalizar
            await updateDoc(doc(db, "operaciones", op.id), {
              estado: "FINALIZADO",
              fechaActualizacion: serverTimestamp(),
            });
            continue;
          }

          // Fecha de vencimiento de la próxima cuota impaga
          const proximaCuota = cuotasPagadas + 1;
          const fechaVenc = new Date(fechaLiq);
          fechaVenc.setMonth(fechaVenc.getMonth() + proximaCuota);
          fechaVenc.setHours(0, 0, 0, 0);

          const diffMs   = hoy.getTime() - fechaVenc.getTime();
          const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffDias <= 0) continue; // No vencida aún

          // Días reales de mora (restando gracia)
          const diasMora = Math.max(0, diffDias - diasGracia);
          if (diasMora === 0) continue;

          // Calcular punitorios y moratorios
          let punitorio = 0;
          let moratorio = 0;

          if (aplicarPunitorio) {
            punitorio = Math.round(monto * (tasaPunitoriaDiaria / 100) * diasMora);
          }
          if (aplicarMoratorio) {
            moratorio = Math.round(monto * (tasaMoratoriaDiaria / 100) * diasMora);
          }

          const diasMoraActual = op.cobranzas?.diasMora || 0;
          const esMoraVNueva   = diasMoraActual === 0 && diasMora > 0;
          const huboCalibio    = diasMora !== diasMoraActual;

          if (!huboCalibio) continue; // Sin cambios, no escribir

          // Actualizar operación
          const updates: any = {
            "cobranzas.diasMora":           diasMora,
            "cobranzas.fechaVencimientoOp": fechaVenc,
            "cobranzas.ultimaActCron":      serverTimestamp(),
            fechaActualizacion:             serverTimestamp(),
          };

          if (aplicarPunitorio) updates["cobranzas.punitorioDiario"] = tasaPunitoriaDiaria;
          if (aplicarPunitorio) updates["cobranzas.punitorioAcumulado"] = punitorio;
          if (aplicarMoratorio) updates["cobranzas.moratorioAcumulado"] = moratorio;
          if (aplicarPunitorio || aplicarMoratorio) {
            updates["cobranzas.totalRecargo"] = punitorio + moratorio;
          }

          if (esMoraVNueva || op.estado === "LIQUIDADO") {
            updates["estado"] = "EN_MORA";
            totalNuevasMora++;
          }

          await updateDoc(doc(db, "operaciones", op.id), updates);

          // Auditoría
          await addDoc(collection(db, "auditoria"), {
            operacionId:  op.id,
            entidadId:    entidad.id,
            accion:       "CRON_MORA_ACTUALIZADA",
            detalles:     `Días mora: ${diasMora} | Punitorio: $${punitorio} | Moratorio: $${moratorio}`,
            usuarioEmail: "cron@sistema",
            fecha:        serverTimestamp(),
          });

          // Notificación interna si es día 1 de mora
          if (esMoraVNueva) {
            await addDoc(collection(db, "notificaciones"), {
              entidadId:    entidad.id,
              tipo:         "CLIENTE_EN_MORA",
              titulo:       "Cliente entró en mora",
              descripcion:  `${op.cliente?.nombre} — Cuota ${proximaCuota}/${totalCuotas} vencida`,
              operacionId:  op.id,
              linkDestino:  "/dashboard/cobranzas",
              rolesDestino: ["GERENTE_GENERAL", "GERENTE_SUCURSAL", "COBRANZAS", "MASTER_PAYSUR"],
              leida:        false,
              fecha:        serverTimestamp(),
            });
          }

          // WhatsApp al cliente
          if (notificarWA && diasNotifWA.includes(diasMora)) {
            const tel = op.cliente?.telefono?.replace(/\D/g, "");
            if (tel && cfg.whatsapp?.activo && cfg.whatsapp?.accessToken) {
              try {
                await enviarWhatsappMora({
                  telefono:     tel,
                  clienteNombre: op.cliente?.nombre || "Cliente",
                  diasMora,
                  cuota:        valorCuota,
                  recargo:      punitorio + moratorio,
                  entidadNombre: entidad.nombreFantasia,
                  accessToken:  cfg.whatsapp.accessToken,
                  phoneNumberId: cfg.whatsapp.phoneNumberId,
                });
                totalWA++;
              } catch (e) {
                console.error(`[Cron] WA falló para op ${op.id}:`, e);
              }
            }
          }

          totalProcesadas++;
        } catch (opError) {
          console.error(`[Cron] Error en op ${opDoc.id}:`, opError);
          errores++;
        }
      }
    }

    // Log global del cron
    await addDoc(collection(db, "logs_cron"), {
      tipo:            "MORA_NOCTURNO",
      fecha:           serverTimestamp(),
      totalProcesadas,
      totalNuevasMora,
      totalWA,
      errores,
    });

    return NextResponse.json({
      ok: true,
      totalProcesadas,
      totalNuevasMora,
      totalWA,
      errores,
    });

  } catch (error: any) {
    console.error("[Cron mora] Error global:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper WhatsApp Meta Cloud API ──────────────────────────────────────────
async function enviarWhatsappMora(datos: {
  telefono: string;
  clienteNombre: string;
  diasMora: number;
  cuota: number;
  recargo: number;
  entidadNombre: string;
  accessToken: string;
  phoneNumberId: string;
}) {
  const { telefono, clienteNombre, diasMora, cuota, recargo, entidadNombre, accessToken, phoneNumberId } = datos;

  const texto =
    `⚠️ *Aviso de vencimiento — ${entidadNombre}*\n\n` +
    `Hola ${clienteNombre}! Tu cuota lleva *${diasMora} día${diasMora > 1 ? "s" : ""} de mora*.\n\n` +
    `💰 Cuota: $${Math.round(cuota).toLocaleString("es-AR")}\n` +
    `📈 Recargo acumulado: $${Math.round(recargo).toLocaleString("es-AR")}\n\n` +
    `Para regularizar tu situación, comunicate con nosotros a la brevedad.`;

  await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefono,
      type: "text",
      text: { body: texto },
    }),
  });
}
