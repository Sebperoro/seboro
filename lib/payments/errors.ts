// Mensajes de error del flujo de pago que ya están redactados en español
// plano, son accionables para el lector, y no filtran nombres de variables
// de entorno, configuración interna, ni texto crudo de Postgres/Mercado Pago.
// Cualquier otro error se reemplaza por PURCHASE_GENERIC_ERROR antes de
// mostrarse al usuario — el mensaje real siempre se registra en servidor
// aparte, vía logPaymentError().
const SAFE_PURCHASE_ERRORS = new Set<string>([
  "Falta la obra.",
  "Obra no encontrada.",
  "Esta obra es gratuita. Usa Obtener en lugar de Comprar.",
  "El autor ya tiene acceso completo a su propia obra.",
  "Debes iniciar sesión.",
  "La sesión no es válida o ya expiró.",
  "Mercado Pago no pudo crear la preferencia de pago.",
  "Mercado Pago no devolvió una URL de checkout.",
  "No se pudo identificar la obra.",
  "Inicia sesión para verificar tu compra.",
  "No se pudo verificar el pago.",
  "El pago no está vinculado a una compra de SEBORO.",
  "La compra vinculada no existe en SEBORO.",
  "Ese pago no pertenece a tu cuenta.",
  "El monto o la moneda del pago no coinciden con la compra.",
  "Supabase no está configurado.",
  "Falta el identificador del pago.",
  "Mercado Pago no devolvió el pago solicitado.",
]);

export const PURCHASE_GENERIC_ERROR =
  "No se pudo procesar tu compra. Intenta nuevamente más tarde.";

export function toSafePurchaseMessage(
  message: string | null | undefined
): string {
  if (message && SAFE_PURCHASE_ERRORS.has(message)) {
    return message;
  }

  return PURCHASE_GENERIC_ERROR;
}

export function logPaymentError(context: string, error: unknown) {
  console.error(`[payments:${context}]`, error);
}
