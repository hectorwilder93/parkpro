import { Box, Typography, Button, Chip, CircularProgress, Alert } from '@mui/material';
import { Bluetooth, Print, LinkOff, PrintDisabled } from '@mui/icons-material';

interface PrinterDeviceProps {
  connectedPrinter: { name: string; id: string } | null;
  isConnecting: boolean;
  isPrinting: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onPrintTest: () => void;
}

export default function PrinterDevice({
  connectedPrinter,
  isConnecting,
  isPrinting,
  error,
  onConnect,
  onDisconnect,
  onPrintTest,
}: PrinterDeviceProps) {
  const isConnected = !!connectedPrinter;

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: isConnected ? 'info.main' : 'grey.300',
        borderRadius: 2,
        bgcolor: isConnected ? 'info.light' : 'grey.50',
        opacity: isConnecting ? 0.7 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isConnected ? (
            <Print sx={{ color: 'info.main' }} />
          ) : (
            <PrintDisabled sx={{ color: 'grey.500' }} />
          )}
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Impresora Térmica
          </Typography>
        </Box>
        <Chip
          label={isConnected ? 'Conectada' : 'Desconectada'}
          color={isConnected ? 'info' : 'default'}
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
            Impresora: <strong>{connectedPrinter.name}</strong>
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        {!isConnected ? (
          <Button
            size="small"
            variant="contained"
            color="info"
            startIcon={isConnecting ? <CircularProgress size={16} color="inherit" /> : <Bluetooth />}
            onClick={onConnect}
            disabled={isConnecting}
            fullWidth
          >
            {isConnecting ? 'Conectando...' : 'Conectar Impresora'}
          </Button>
        ) : (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={isPrinting ? <CircularProgress size={16} /> : <Print />}
              onClick={onPrintTest}
              disabled={isPrinting}
              sx={{ flex: 1 }}
            >
              {isPrinting ? 'Imprimiendo...' : 'Test'}
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