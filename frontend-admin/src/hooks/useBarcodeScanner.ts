import { useState, useCallback, useEffect, useRef } from 'react';

export interface ScannerDevice {
  name: string;
  id: string;
}

export interface UseBarcodeScannerReturn {
  isScanning: boolean;
  isConnecting: boolean;
  connectedDevice: ScannerDevice | null;
  availableDevices: ScannerDevice[];
  lastScannedCode: string | null;
  error: string | null;
  scanDevice: () => Promise<void>;
  disconnectDevice: () => Promise<void>;
  startScan: () => Promise<void>;
}

export function useBarcodeScanner(): UseBarcodeScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<ScannerDevice | null>(null);
  const [availableDevices] = useState<ScannerDevice[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const disconnectDevice = useCallback(async () => {
    try {
      if (characteristicRef.current) {
        await characteristicRef.current.stopNotifications();
        characteristicRef.current = null;
      }
      if (bluetoothDeviceRef.current) {
        await bluetoothDeviceRef.current.gatt?.disconnect();
        bluetoothDeviceRef.current = null;
      }
      setConnectedDevice(null);
      setIsScanning(false);
    } catch (err) {
      console.error('Error disconnecting device:', err);
    }
  }, []);

  const scanDevice = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth no está, disponible en este navegador. Use Chrome o Edge.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['0000180d-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'Scanner' },
          { namePrefix: 'Barcode' },
          { namePrefix: 'CS' },
          { namePrefix: 'HM' },
        ],
        optionalServices: ['0000180d-0000-1000-8000-00805f9b34fb', '00001800-0000-1000-8000-00805f9b34fb'],
      });

      const deviceName = device.name || `Device ${device.id.slice(0, 8)}`;

      bluetoothDeviceRef.current = device;
      setConnectedDevice({ name: deviceName, id: device.id });

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('No se pudo conectar al servidor GATT');
      }

      let service: BluetoothRemoteGATTService | undefined;

      try {
        service = await server.getPrimaryService('0000180d-0000-1000-8000-00805f9b34fb');
      } catch {
        try {
          service = await server.getPrimaryService('00001800-0000-1000-8000-00805f9b34fb');
        } catch {
          const services = await server.getPrimaryServices();
          if (services.length > 0) {
            service = services[0];
          }
        }
      }

      if (!service) {
        throw new Error('No se encontra el servicio GATT');
      }

      const characteristics = await service.getCharacteristics();
      const notifyChar = characteristics.find((c: BluetoothRemoteGATTCharacteristic) =>
        c.properties.notify || c.properties.indicate
      );

      if (!notifyChar) {
        throw new Error('No se encontra caracterí­stica de notificación');
      }

      characteristicRef.current = notifyChar;

      await notifyChar.startNotifications();

      notifyChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          const decoder = new TextDecoder('utf-8');
          const code = decoder.decode(value).trim().replace(/[\x00-\x1F]/g, '');
          if (code.length > 0) {
            setLastScannedCode(code);
            setIsScanning(false);
          }
        }
      });

    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.name === 'AbortError') {
        return;
      }
      setError(err.message || 'Error al conectar con el escaner');
      setConnectedDevice(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setLastScannedCode(null);
  }, []);

  useEffect(() => {
    return () => {
      disconnectDevice();
    };
  }, [disconnectDevice]);

  return {
    isScanning,
    isConnecting,
    connectedDevice,
    availableDevices,
    lastScannedCode,
    error,
    scanDevice,
    disconnectDevice,
    startScan,
  };
}