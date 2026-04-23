import { Box, Typography, Button, Chip, CircularProgress, Alert } from '@mui/material';
import { Bluetooth, BluetoothDisabled, QrCodeScanner, LinkOff } from '@mui/icons-material';

interface ScannerDeviceProps {
  connectedDevice: { name: string; id: string } | null;
  isConnecting: boolean;
  isScanning: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartScan: () => void;
}

export default function ScannerDevice({
  connectedDevice,
  isConnecting,
  isScanning,
  error,
  onConnect,
  onDisconnect,
  onStartScan,
}: ScannerDeviceProps) {
  const isConnected = !!connectedDevice;

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: isConnected ? 'success.main' : 'grey.300',
        borderRadius: 2,
        bgcolor: isConnected ? 'success.light' : 'grey.50',
        opacity: isConnecting ? 0.7 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isConnected ? (
            <Bluetooth sx={{ color: 'success.main' }} />
          ) : (
            <BluetoothDisabled sx={{ color: 'grey.500' }} />
          )}
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Pistola Escaner
          </Typography>
        </Box>
        <Chip
          label={isConnected ? 'Conectado' : 'Desconectado'}
          color={isConnected ? 'success' : 'default'}
          size="small"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1, py: 0 }}>
          {error}
        </Alert>
      )}

      {isConnected && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Dispositivo: <strong>{connectedDevice.name}</strong>
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        {!isConnected ? (
          <Button
            size="small"
            variant="contained"
            startIcon={isConnecting ? <CircularProgress size={16} color="inherit" /> : <QrCodeScanner />}
            onClick={onConnect}
            disabled={isConnecting}
            fullWidth
          >
            {isConnecting ? 'Conectando...' : 'Conectar Pistola'}
          </Button>
        ) : (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<QrCodeScanner />}
              onClick={onStartScan}
              disabled={isScanning}
              sx={{ flex: 1 }}
            >
              {isScanning ? 'Escaneando...' : 'Escanear'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<LinkOff />}
              onClick={onDisconnect}
              sx={{ flex: 1 }}
            >
              Desconectar
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}