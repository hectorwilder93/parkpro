export interface TarifasParking {
  tarifaCarro: number;
  tarifaMotocicleta: number;
  tarifaCamioneta: number;
  tarifaDiscapacitados: number;
  tarifaEmpleado: number;
}

export const TARIFAS_DEFAULT: TarifasParking = {
  tarifaCarro: 10000,
  tarifaMotocicleta: 3000,
  tarifaCamioneta: 10000,
  tarifaDiscapacitados: 3000,
  tarifaEmpleado: 1000,
};

const TARIFA_CARRO_KEYS = ['Automóvil', 'Automovil', 'AUTOMOVIL', 'AUTOMÓVIL', 'Vehículo', 'Vehiculo', 'CARRO', 'CAR', '4 RUEDAS', '4RUEDAS'];
const TARIFA_MOTO_KEYS = ['Motocicleta', 'MOTOCICLETA', 'MOTO'];
const TARIFA_CAMIONETA_KEYS = ['Camioneta', 'CAMIONETA', 'VAN'];
const TARIFA_DISC_KEYS = ['Discapacitados', 'DISCAPACITADOS', 'Discapacitado', 'DISCAPACITADO', 'Discap'];
const TARIFA_EMPLEADO_KEYS = ['Empleado', 'EMPLEADO', 'Personal', 'PERSONAL'];

export function getTarifaPorTipo(
  tipoVehiculo: string,
  tarifas: TarifasParking = TARIFAS_DEFAULT,
): number {
  const tipo = tipoVehiculo;
  
  if (TARIFA_CARRO_KEYS.includes(tipo)) {
    return tarifas.tarifaCarro;
  }
  if (TARIFA_MOTO_KEYS.includes(tipo)) {
    return tarifas.tarifaMotocicleta;
  }
  if (TARIFA_CAMIONETA_KEYS.includes(tipo)) {
    return tarifas.tarifaCamioneta;
  }
  if (TARIFA_DISC_KEYS.includes(tipo)) {
    return tarifas.tarifaDiscapacitados;
  }
  if (TARIFA_EMPLEADO_KEYS.includes(tipo)) {
    return tarifas.tarifaEmpleado;
  }
  
  return tarifas.tarifaCarro;
}

export function getTarifaParaEmpleado(
  tarifas: TarifasParking = TARIFAS_DEFAULT,
): number {
  return tarifas.tarifaEmpleado;
}

export function esTipoVehiculoEmpleado(tipo: string): boolean {
  return TARIFA_EMPLEADO_KEYS.includes(tipo);
}