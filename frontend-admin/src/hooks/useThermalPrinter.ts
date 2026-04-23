import { useState, useCallback, useEffect, useRef } from 'react';

export interface PrinterDevice {
  name: string;
  id: string;
}

export interface UseThermalPrinterReturn {
  isPrinting: boolean;
  isConnecting: boolean;
  connectedPrinter: PrinterDevice | null;
  availablePrinters: PrinterDevice[];
  error: string | null;
  connectPrinter: () => Promise<void>;
  disconnectPrinter: () => Promise<void>;
  printEntryTicket: (data: PrintEntryData) => Promise<void>;
  printExitTicket: (data: PrintExitData) => Promise<void>;
  printTest: () => Promise<void>;
}

export interface PrintEntryData {
  codigoBarras: string;
  placa: string;
  tipoVehiculo: string;
  espacio: string;
  fechaIngreso: string;
  nombreParqueadero: string;
}

export interface PrintExitData {
  codigoBarras: string;
  placa: string;
  tipoVehiculo: string;
  horaIngreso: string;
  horaSalida: string;
  horas: number;
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: string;
  nombreParqueadero: string;
}

const PRINTER_SERVICE_UUID = '00001812-0000-1000-8000-00805f9b34fb';
const PRINTER_WRITE_UUID = '00002a00-0000-1000-8000-00805f9b34fb';

export function useThermalPrinter(): UseThermalPrinterReturn {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterDevice | null>(null);
  const [availablePrinters] = useState<PrinterDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const printerRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const disconnectPrinter = useCallback(async () => {
    try {
      if (characteristicRef.current) {
        characteristicRef.current = null;
      }
      if (printerRef.current) {
        await printerRef.current.gatt?.disconnect();
        printerRef.current = null;
      }
      setConnectedPrinter(null);
    } catch (err) {
      console.error('Error disconnecting printer:', err);
    }
  }, []);

  const connectPrinter = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth no está, disponible en este navegador. Use Chrome o Edge.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [PRINTER_SERVICE_UUID] },
          { namePrefix: 'Thermal' },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'MP' },
          { namePrefix: 'XP' },
        ],
        optionalServices: [PRINTER_SERVICE_UUID],
      });

      const deviceName = device.name || `Printer ${device.id.slice(0, 8)}`;

      printerRef.current = device;
      setConnectedPrinter({ name: deviceName, id: device.id });

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('No se pudo conectar al servidor GATT');
      }

      const service = await server.getPrimaryService(PRINTER_SERVICE_UUID).catch(() =>
        server.getPrimaryServices().then(s => s[0])
      );

      if (!service) {
        throw new Error('No se encontra el servicio GATT');
      }

      const characteristic = await service.getCharacteristic(PRINTER_WRITE_UUID).catch(async () => {
        const characteristics = await service.getCharacteristics();
        const writable = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
        if (!writable) throw new Error('No se encontra característica de escritura');
        return writable;
      });

      characteristicRef.current = characteristic;

    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.name === 'AbortError') {
        return;
      }
      setError(err.message || 'Error al conectar con la impresora');
      setConnectedPrinter(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const sendToPrinter = useCallback(async (data: Uint8Array): Promise<void> => {
    if (!characteristicRef.current) {
      throw new Error('Impresora no conectada');
    }

    const chunks: Uint8Array[] = [];
    const maxChunkSize = 20;

    for (let i = 0; i < data.length; i += maxChunkSize) {
      const chunk = data.slice(i, i + maxChunkSize);
      chunks.push(chunk);
    }

    for (const chunk of chunks) {
      try {
        const buffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
        if (characteristicRef.current.properties.write) {
          await characteristicRef.current.writeValue(buffer as ArrayBuffer);
        } else if (characteristicRef.current.properties.writeWithoutResponse) {
          await characteristicRef.current.writeValueWithoutResponse(buffer as ArrayBuffer);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        throw new Error(`Error enviando datos: ${err}`);
      }
    }
  }, []);

  const escposInitialize = useCallback(async (): Promise<void> => {
    const commands = new Uint8Array([
      0x1B, 0x40,
      0x1B, 0x74, 0x00,
      0x1B, 0x61, 0x00,
    ]);
    await sendToPrinter(commands);
  }, [sendToPrinter]);

  const escposLineFeed = useCallback(async (lines: number = 1): Promise<void> => {
    const command = new Uint8Array(lines).fill(0x0A);
    await sendToPrinter(command);
  }, [sendToPrinter]);

  const escposAlign = useCallback(async (align: 'left' | 'center' | 'right' = 'left'): Promise<void> => {
    const alignMap: Record<string, number> = { left: 0, center: 1, right: 2 };
    const command = new Uint8Array([0x1B, 0x61, alignMap[align]]);
    await sendToPrinter(command);
  }, [sendToPrinter]);

  const escposBold = useCallback(async (enable: boolean): Promise<void> => {
    const command = new Uint8Array([0x1B, 0x45, enable ? 0x01 : 0x00]);
    await sendToPrinter(command);
  }, [sendToPrinter]);

  const escposDoubleHeight = useCallback(async (enable: boolean): Promise<void> => {
    const command = new Uint8Array([0x1B, 0x21, enable ? 0x10 : 0x00]);
    await sendToPrinter(command);
  }, [sendToPrinter]);

  const escposDoubleWidth = useCallback(async (enable: boolean): Promise<void> => {
    const command = new Uint8Array([0x1B, 0x21, enable ? 0x20 : 0x00]);
    await sendToPrinter(command);
  }, [sendToPrinter]);

  const escposPrintText = useCallback(async (text: string, newLine: boolean = true): Promise<void> => {
    const encoder = new TextEncoder();
    const textData = encoder.encode(text);
    await sendToPrinter(textData);
    if (newLine) {
      await escposLineFeed(1);
    }
  }, [sendToPrinter, escposLineFeed]);

  const escposCut = useCallback(async (): Promise<void> => {
    const commands = new Uint8Array([0x1D, 0x56, 0x00]);
    await sendToPrinter(commands);
  }, [sendToPrinter]);

  const escposOpenCashDrawer = useCallback(async (): Promise<void> => {
    const commands = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    await sendToPrinter(commands);
  }, [sendToPrinter]);

  const printEntryTicket = useCallback(async (data: PrintEntryData): Promise<void> => {
    if (!characteristicRef.current) {
      throw new Error('Impresora no conectada');
    }

    setIsPrinting(true);

    try {
      await escposInitialize();

      await escposAlign('center');
      await escposDoubleWidth(true);
      await escposBold(true);
      await escposPrintText(data.nombreParqueadero, true);
      await escposLineFeed(1);

      await escposDoubleWidth(false);
      await escposBold(false);
      await escposPrintText('- - - TICKET DE INGRESO - - -', true);

      await escposLineFeed(1);
      await escposAlign('left');

      const fecha = new Date(data.fechaIngreso);
      const fechaStr = fecha.toLocaleDateString('es-CO');
      const horaStr = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

      await escposPrintText(`Fecha: ${fechaStr}`, true);
      await escposPrintText(`Hora : ${horaStr}`, true);
      await escposLineFeed(1);

      await escposDoubleHeight(true);
      await escposBold(true);
      await escposPrintText(`Placa: ${data.placa}`, true);
      await escposDoubleHeight(false);
      await escposBold(false);

      await escposPrintText(`Tipo: ${data.tipoVehiculo}`, true);
      await escposPrintText(`Espacio: ${data.espacio}`, true);
      await escposLineFeed(1);

      await escposAlign('center');
      await escposPrintText(`Codigo: ${data.codigoBarras}`, true);
      await escposLineFeed(2);

      await escposPrintText('Conserve este ticket', true);
      await escposPrintText('para el retiro de su vehiculo', true);
      await escposLineFeed(2);

      await escposCut();
      await escposOpenCashDrawer();

    } catch (err: any) {
      throw new Error(`Error imprimiendo ticket: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  }, [isPrinting, escposInitialize, escposLineFeed, escposAlign, escposBold, escposDoubleHeight, escposDoubleWidth, escposPrintText, escposCut, escposOpenCashDrawer]);

  const printExitTicket = useCallback(async (data: PrintExitData): Promise<void> => {
    if (!characteristicRef.current) {
      throw new Error('Impresora no conectada');
    }

    setIsPrinting(true);

    try {
      await escposInitialize();

      await escposAlign('center');
      await escposDoubleWidth(true);
      await escposBold(true);
      await escposPrintText(data.nombreParqueadero, true);
      await escposLineFeed(1);

      await escposDoubleWidth(false);
      await escposBold(false);
      await escposPrintText('- - TICKET LIQUIDACION - -', true);

      await escposLineFeed(1);
      await escposAlign('left');

      const horaIng = new Date(data.horaIngreso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const horaSal = new Date(data.horaSalida).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

      await escposPrintText(`Placa: ${data.placa}`, true);
      await escposPrintText(`Tipo: ${data.tipoVehiculo}`, true);
      await escposPrintText(`Hora Ingreso : ${horaIng}`, true);
      await escposPrintText(`Hora Salida  : ${horaSal}`, true);
      await escposPrintText(`Tiempo: ${data.horas} hora(s)`, true);
      await escposLineFeed(1);

      await escposPrintText(`Subtotal: $${data.subtotal.toLocaleString('es-CO')}`, true);
      await escposPrintText(`IVA (19%): $${data.iva.toLocaleString('es-CO')}`, true);

      await escposDoubleHeight(true);
      await escposBold(true);
      await escposPrintText(`TOTAL: $${data.total.toLocaleString('es-CO')}`, true);
      await escposDoubleHeight(false);
      await escposBold(false);

      await escposPrintText(`Metodo: ${data.metodoPago}`, true);
      await escposLineFeed(1);

      await escposAlign('center');
      await escposPrintText('Gracias por preferirnos', true);
      await escposLineFeed(2);

      await escposCut();
      await escposOpenCashDrawer();

    } catch (err: any) {
      throw new Error(`Error imprimiendo ticket: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  }, [isPrinting, escposInitialize, escposLineFeed, escposAlign, escposBold, escposDoubleHeight, escposDoubleWidth, escposPrintText, escposCut, escposOpenCashDrawer]);

  const printTest = useCallback(async (): Promise<void> => {
    if (!characteristicRef.current) {
      throw new Error('Impresora no conectada');
    }

    setIsPrinting(true);

    try {
      await escposInitialize();

      await escposAlign('center');
      await escposDoubleWidth(true);
      await escposBold(true);
      await escposPrintText('PARKPRO', true);
      await escposLineFeed(1);

      await escposDoubleWidth(false);
      await escposBold(false);
      await escposPrintText('Test de impresion', true);
      await escposPrintText('correcto', true);
      await escposLineFeed(2);

      await escposCut();

    } catch (err: any) {
      throw new Error(`Error en test de impresion: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  }, [isPrinting, escposInitialize, escposLineFeed, escposAlign, escposBold, escposDoubleWidth, escposPrintText, escposCut]);

  useEffect(() => {
    return () => {
      disconnectPrinter();
    };
  }, [disconnectPrinter]);

  useEffect(() => {
    if (connectedPrinter) {
      localStorage.setItem('printer_device_id', connectedPrinter.id);
      localStorage.setItem('printer_device_name', connectedPrinter.name);
    }
  }, [connectedPrinter]);

  return {
    isPrinting,
    isConnecting,
    connectedPrinter,
    availablePrinters,
    error,
    connectPrinter,
    disconnectPrinter,
    printEntryTicket,
    printExitTicket,
    printTest,
  };
}