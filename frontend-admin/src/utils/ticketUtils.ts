export interface Ticket {
  id: number;
  codigo_barras: string;
  placa: string;
  tipo_vehiculo: string;
  espacio_id: string;
  horario_ingreso: string;
  horario_salida?: string;
  estado: string;
}

export const TARIFA_AUTOMOVIL = 10000;
export const TARIFA_MOTOCICLETA = 3000;
export const TARIFA_EMPLEADO = 1000;
export const TARIFA_DISCAPACITADOS = 0;
export const MINUTOS_POR_DIA = 24 * 60;
export const IVA_RATE = 0.19;

export interface LiquidacionResult {
  horasCobrar: number;
  monto: number;
  tarifa: number;
}

export function calcularLiquidacion(ticket: Ticket, esEmpleadoTicket: boolean): LiquidacionResult {
  const diffMs = new Date().getTime() - new Date(ticket.horario_ingreso).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  let tarifa: number;

  if (esEmpleadoTicket) {
    tarifa = TARIFA_EMPLEADO;
  } else {
    switch (ticket.tipo_vehiculo) {
      case 'Automovil':
        tarifa = TARIFA_AUTOMOVIL;
        break;
      case 'Camioneta':
        tarifa = TARIFA_AUTOMOVIL;
        break;
      case 'Motocicleta':
        tarifa = TARIFA_MOTOCICLETA;
        break;
      case 'Discapacitados':
        tarifa = TARIFA_DISCAPACITADOS;
        break;
      default:
        tarifa = TARIFA_AUTOMOVIL;
    }
  }

  let monto: number;
  let horasCobrar: number;

  if (diffMinutes <= 0) {
    horasCobrar = 0;
    monto = 0;
  } else if (diffMinutes <= MINUTOS_POR_DIA) {
    horasCobrar = Math.ceil(diffMinutes / 60);
    monto = tarifa;
  } else {
    const diasCompletos = Math.floor(diffMinutes / MINUTOS_POR_DIA);
    const minutosExtra = diffMinutes % MINUTOS_POR_DIA;
    horasCobrar = Math.ceil(diffMinutes / 60);
    const precioMinutoExtra = tarifa / MINUTOS_POR_DIA;
    monto = (diasCompletos * tarifa) + Math.round(minutosExtra * precioMinutoExtra);
  }

  return { horasCobrar, monto, tarifa };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

export function calculateTime(ingreso: string, salida?: string): string {
  const start = new Date(ingreso);
  const end = salida ? new Date(salida) : new Date();
  const diff = end.getTime() - start.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}min`;
}