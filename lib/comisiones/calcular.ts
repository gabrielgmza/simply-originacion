// lib/comisiones/calcular.ts
// Calcula la comisión del vendedor al liquidar una operación
// Prioridad: override del vendedor > config por producto > default 0

import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, increment } from "firebase/firestore";

export interface ComisionResult {
  monto:       number;
  porcentaje:  number;
  tipo:        "PORCENTUAL" | "FIJA";
  producto:    string;
  origen:      "VENDEDOR_OVERRIDE" | "PRODUCTO_CONFIG" | "DEFAULT";
}

export async function calcularComision(
  operacionId: string,
  entidadId:   string,
  vendedorId:  string,
  producto:    string,    // "CUAD" | "PRIVADO" | "ADELANTO"
  montoOperacion: number
): Promise<ComisionResult> {
  // 1. Buscar override del vendedor
  try {
    const vendSnap = await getDoc(doc(db, "usuarios", vendedorId));
    const vendData = vendSnap.data();
    const overrides = vendData?.comisiones || {};

    // Override por producto específico
    if (overrides[producto]?.porcentaje !== undefined) {
      const porc = overrides[producto].porcentaje;
      return {
        monto: Math.round(montoOperacion * (porc / 100)),
        porcentaje: porc,
        tipo: "PORCENTUAL",
        producto,
        origen: "VENDEDOR_OVERRIDE",
      };
    }

    // Override general (todos los productos)
    if (overrides.general?.porcentaje !== undefined) {
      const porc = overrides.general.porcentaje;
      return {
        monto: Math.round(montoOperacion * (porc / 100)),
        porcentaje: porc,
        tipo: "PORCENTUAL",
        producto,
        origen: "VENDEDOR_OVERRIDE",
      };
    }
  } catch (e) {
    console.error("[Comisiones] Error leyendo vendedor:", e);
  }

  // 2. Buscar config por producto de la entidad
  try {
    const entSnap = await getDoc(doc(db, "entidades", entidadId));
    const entData = entSnap.data();
    const productoKey = producto === "PRIVADO" ? "PRIVADO" : producto === "CUAD" ? "CUAD" : "ADELANTO";
    const cfgProducto = entData?.configuracion?.productos?.[productoKey];

    if (cfgProducto?.comisionVendedor !== undefined && cfgProducto.comisionVendedor > 0) {
      const porc = cfgProducto.comisionVendedor;
      return {
        monto: Math.round(montoOperacion * (porc / 100)),
        porcentaje: porc,
        tipo: "PORCENTUAL",
        producto,
        origen: "PRODUCTO_CONFIG",
      };
    }
  } catch (e) {
    console.error("[Comisiones] Error leyendo entidad:", e);
  }

  // 3. Default: 0
  return { monto: 0, porcentaje: 0, tipo: "PORCENTUAL", producto, origen: "DEFAULT" };
}

// Registrar comisión en Firestore al liquidar
export async function registrarComision(
  operacionId: string,
  entidadId:   string,
  vendedorId:  string,
  comision:    ComisionResult,
  montoOperacion: number,
  clienteNombre: string
): Promise<string | null> {
  if (comision.monto <= 0) return null;

  try {
    const ref = await addDoc(collection(db, "comisiones"), {
      operacionId,
      entidadId,
      vendedorId,
      montoOperacion,
      montoComision:  comision.monto,
      porcentaje:     comision.porcentaje,
      tipo:           comision.tipo,
      producto:       comision.producto,
      origen:         comision.origen,
      clienteNombre,
      estado:         "PENDIENTE",   // PENDIENTE → PAGADA
      mes:            new Date().toISOString().slice(0, 7),  // "2026-03"
      fechaCreacion:  serverTimestamp(),
    });

    // Actualizar la operación con datos de comisión
    await updateDoc(doc(db, "operaciones", operacionId), {
      "comision.vendedorId":   vendedorId,
      "comision.monto":        comision.monto,
      "comision.porcentaje":   comision.porcentaje,
      "comision.estado":       "PENDIENTE",
    });

    return ref.id;
  } catch (e) {
    console.error("[Comisiones] Error registrando:", e);
    return null;
  }
}
