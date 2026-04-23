export const IVA_TASA_DEFAULT = 0.19;

export interface CalculoImpuestoResult {
  base: number;
  iva: number;
  total: number;
}

export function calcularImpuestoSustractivo(
  valorTotal: number,
  tasa: number = IVA_TASA_DEFAULT,
): CalculoImpuestoResult {
  const base = valorTotal / (1 + tasa);
  const iva = valorTotal - base;
  
  return {
    base: Math.round(base * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    total: valorTotal,
  };
}

export function calcularImpuestoSustractivoSinRedondeo(
  valorTotal: number,
  tasa: number = IVA_TASA_DEFAULT,
): CalculoImpuestoResult {
  const base = valorTotal / (1 + tasa);
  const iva = valorTotal - base;
  
  return {
    base,
    iva,
    total: valorTotal,
  };
}

export function redondearAPMultiploCercano(valor: number, multiplo: number): number {
  return Math.round(valor / multiplo) * multiplo;
}

export function formatearMontoParaPago(
  monto: number,
  esEfectivo: boolean,
  multiploRedondeo: number = 50,
): number {
  if (esEfectivo) {
    return redondearAPMultiploCercano(monto, multiploRedondeo);
  }
  return Math.round(monto * 100) / 100;
}

export function esPagoEnEfectivo(metodoPago: string): boolean {
  const metodo = metodoPago.toUpperCase();
  return metodo === 'EFECTIVO' || metodo === 'CASH';
}