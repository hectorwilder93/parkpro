import { useState, useEffect, useCallback } from 'react';
import { Box, Card, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tabs, Tab, TextField, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress, IconButton, Divider, Checkbox, FormControlLabel, Tooltip } from '@mui/material';
import { Add, Search, Close, Print, ContentCopy, ExitToApp, LocalParking, Print as PrintIcon } from '@mui/icons-material';
import { ticketsApi } from '../services/api';
import Barcode from 'react-barcode';
import ScannerDevice from '../components/devices/ScannerDevice';
import PrinterDevice from '../components/devices/PrinterDevice';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useThermalPrinter } from '../hooks/useThermalPrinter';
import { IVA_RATE, calcularLiquidacion, TARIFA_EMPLEADO } from '../utils/ticketUtils';

interface Ticket {
  id: number;
  codigo_barras: string;
  placa: string;
  tipo_vehiculo: string;
  espacio_id: string;
  horario_ingreso: string;
  horario_salida?: string;
  estado: string;
}


interface NewTicketData {
  placa: string;
  tipo_vehiculo: string;
  notas: string;
}

interface CreatedTicket {
  id: number;
  codigo_barras: string;
  placa: string;
  tipo_vehiculo: string;
  espacio_id: string;
  horario_ingreso: string;
}

interface LiquidacionData {
  horas: number;
  monto: number;
  tarifa: number;
}

interface CalculatedIva {
  subtotal: number;
  iva: number;
}

interface TicketLiquidacion {
  placa: string;
  tipo_vehiculo: string;
  hora_ingreso: string;
  hora_salida: string;
  horas: number;
  subtotal: number;
  iva: number;
  total: number;
  metodo_pago: string;
}

export default function Tickets() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [openTicketDialog, setOpenTicketDialog] = useState(false);
  const [openLiquidacionDialog, setOpenLiquidacionDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newTicket, setNewTicket] = useState<NewTicketData>({ placa: '', tipo_vehiculo: 'Automovil', notas: '' });
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [liquidacion, setLiquidacion] = useState<LiquidacionData | null>(null);
  const [calculatedIva, setCalculatedIva] = useState<CalculatedIva | null>(null);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [ticketLiquidacion, setTicketLiquidacion] = useState<TicketLiquidacion | null>(null);
  const [esEmpleado, setEsEmpleado] = useState(false);

  const [openPagoDigital, setOpenPagoDigital] = useState(false);
  const [pagoDigitalProcesando, setPagoDigitalProcesando] = useState(false);
  const [pagoDigitalExito, setPagoDigitalExito] = useState(false);
  const [datosPago, setDatosPago] = useState({
    telefono: '',
    email: '',
    referencia: '',
  });

  const scanner = useBarcodeScanner();
  const printer = useThermalPrinter();
  const [scanResult, setScanResult] = useState<string | null>(null);

  const handleBarcodeScanned = useCallback(async (codigoBarras: string) => {
    if (!codigoBarras) return;

    setScanResult(codigoBarras);

    try {
      const response = await ticketsApi.search({ codigo_barras: codigoBarras });
      const foundTicket = response.data;

      if (foundTicket && foundTicket.estado === 'ACTIVO') {
        setSelectedTicket(foundTicket);
        setOpenLiquidacionDialog(true);

        const { horasCobrar, monto, tarifa } = calcularLiquidacion(foundTicket, false);

        const totalBase = monto;
        const ivaCalculado = Math.round(totalBase * IVA_RATE);
        const totalConIva = totalBase + ivaCalculado;

        setLiquidacion({
          horas: horasCobrar,
          monto: totalConIva,
          tarifa
        });
        setCalculatedIva({ subtotal: totalBase, iva: ivaCalculado });
      } else if (foundTicket && foundTicket.estado === 'FINALIZADO') {
        setError('El ticket ya fue liquidado');
      } else {
        setError('Ticket no encontrado');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ticket no encontrado');
    }

    setScanResult(null);
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await ticketsApi.getAll();
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching tickets', err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (scanner.lastScannedCode && !scanResult) {
      handleBarcodeScanned(scanner.lastScannedCode);
    }
  }, [scanner.lastScannedCode]);

  useEffect(() => {
    return () => {
      if (scanner.lastScannedCode) {
        scanner.lastScannedCode = null;
      }
    };
  }, []);

  const filteredTickets = tickets.filter(t => {
    if (tab === 0) return true;
    if (tab === 1) return t.estado === 'ACTIVO';
    if (tab === 2) return t.estado === 'FINALIZADO';
    return true;
  }).filter(t => t.placa.toLowerCase().includes(search.toLowerCase()) || t.codigo_barras.toLowerCase().includes(search.toLowerCase()));

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'FINALIZADO': return 'info';
      case 'ANULADO': return 'error';
      default: return 'default';
    }
  };

  const handleOpenDialog = () => {
    setNewTicket({ placa: '', tipo_vehiculo: 'Automovil', notas: '' });
    setError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleSubmit = async () => {
    if (!newTicket.placa.trim()) {
      setError('La placa es requerida');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await ticketsApi.entry({
        placa: newTicket.placa.toUpperCase(),
        tipo_vehiculo: newTicket.tipo_vehiculo,
        notas: newTicket.notas,
      });

      const ticket: CreatedTicket = {
        id: response.data.id,
        codigo_barras: response.data.codigo_barras,
        placa: response.data.placa,
        tipo_vehiculo: response.data.tipo_vehiculo,
        espacio_id: response.data.espacio_id,
        horario_ingreso: response.data.horario_ingreso,
      };

      setCreatedTicket(ticket);
      setOpenDialog(false);
      setOpenTicketDialog(true);
      setNewTicket({ placa: '', tipo_vehiculo: 'Automovil', notas: '' });

      fetchTickets();

    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar la entrada');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseTicketDialog = () => {
    setOpenTicketDialog(false);
    setCreatedTicket(null);
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const handlePrintToThermal = async () => {
    if (!createdTicket) return;

    try {
      await printer.printEntryTicket({
        codigoBarras: createdTicket.codigo_barras,
        placa: createdTicket.placa,
        tipoVehiculo: createdTicket.tipo_vehiculo,
        espacio: createdTicket.espacio_id,
        fechaIngreso: createdTicket.horario_ingreso,
        nombreParqueadero: 'PARKPRO',
      });
    } catch (err: any) {
      setError('Error al imprimir: ' + err.message);
    }
  };

  const copyToClipboard = () => {
    if (createdTicket) {
      navigator.clipboard.writeText(createdTicket.codigo_barras);
    }
  };

  const handleOpenLiquidacion = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setError('');
    setEsEmpleado(false);
    setOpenLiquidacionDialog(true);

    const { horasCobrar, monto, tarifa } = calcularLiquidacion(ticket, false);

    const totalBase = monto;
    const ivaCalculado = Math.round(totalBase * IVA_RATE);
    const totalConIva = totalBase + ivaCalculado;

    setLiquidacion({
      horas: horasCobrar,
      monto: totalConIva,
      tarifa
    });
    setCalculatedIva({ subtotal: totalBase, iva: ivaCalculado });
  };

  const handleCloseLiquidacion = () => {
    setOpenLiquidacionDialog(false);
    setSelectedTicket(null);
    setLiquidacion(null);
    setCalculatedIva(null);
    setEsEmpleado(false);
  };

  const handleEsEmpleadoChange = (checked: boolean) => {
    setEsEmpleado(checked);
    if (selectedTicket) {
      const { horasCobrar, monto, tarifa } = calcularLiquidacion(selectedTicket, checked);
      const totalBase = monto;
      const ivaCalculado = Math.round(totalBase * IVA_RATE);
      const totalConIva = totalBase + ivaCalculado;
      setLiquidacion({ horas: horasCobrar, monto: totalConIva, tarifa });
      setCalculatedIva({ subtotal: totalBase, iva: ivaCalculado });
    }
  };

  const handleProcesarSalida = () => {
    if (!selectedTicket || !liquidacion) return;

    if (metodoPago === 'NEQUI' || metodoPago === 'DAVIPLATA') {
      setDatosPago({ telefono: '', email: '', referencia: '' });
      setOpenPagoDigital(true);
      setPagoDigitalProcesando(false);
      setPagoDigitalExito(false);
    } else {
      confirmarSalida();
    }
  };

  const handleIniciarPagoDigital = async () => {
    if (!datosPago.telefono.trim()) {
      setError('Ingrese el numero de telefono');
      return;
    }

    if (!selectedTicket || !liquidacion) {
      setError('Error: No hay ticket seleccionado');
      return;
    }

    setError('');
    setPagoDigitalProcesando(true);

    try {
      await ticketsApi.digitalPayment({
        codigo_barras: selectedTicket.codigo_barras,
        metodo_pago: metodoPago,
        monto: liquidacion.monto,
        telefono: datosPago.telefono,
        email: datosPago.email,
        referencia: datosPago.referencia,
      });

      setPagoDigitalProcesando(false);
      setPagoDigitalExito(true);
    } catch (err: any) {
      setPagoDigitalProcesando(false);
      setError(err.response?.data?.message || 'Error al procesar el pago digital');
    }
  };

  const confirmarSalida = async () => {
    if (!selectedTicket || !liquidacion) return;

    const esPagoDigital = metodoPago === 'NEQUI' || metodoPago === 'DAVIPLATA';

    if (!esPagoDigital) {
      try {
        await ticketsApi.exit({
          codigo_barras: selectedTicket.codigo_barras,
          metodo_pago: metodoPago,
          monto: liquidacion.monto,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al procesar la salida');
        return;
      }
    }

    const ahora = new Date();
    const totalBase = liquidacion.monto;
    const iva = Math.round(totalBase * IVA_RATE);
    const total = totalBase + iva;

    const ticketLiq: TicketLiquidacion = {
      placa: selectedTicket.placa,
      tipo_vehiculo: selectedTicket.tipo_vehiculo,
      hora_ingreso: selectedTicket.horario_ingreso,
      hora_salida: ahora.toISOString(),
      horas: liquidacion.horas,
      subtotal: totalBase,
      iva: iva,
      total: total,
      metodo_pago: metodoPago,
    };

    if (printer.connectedPrinter) {
      try {
        await printer.printExitTicket({
          codigoBarras: selectedTicket.codigo_barras,
          placa: selectedTicket.placa,
          tipoVehiculo: selectedTicket.tipo_vehiculo,
          horaIngreso: selectedTicket.horario_ingreso,
          horaSalida: ahora.toISOString(),
          horas: liquidacion.horas,
          subtotal: totalBase,
          iva: iva,
          total: total,
          metodoPago: metodoPago,
          nombreParqueadero: 'PARKPRO',
        });
      } catch (err: any) {
        console.error('Error printing exit ticket:', err);
      }
    }

    setTicketLiquidacion(ticketLiq);
    setOpenLiquidacionDialog(false);
    setOpenPagoDigital(false);
    setPagoDigitalExito(false);

    setTickets(tickets.map(t =>
      t.id === selectedTicket.id
        ? { ...t, estado: 'FINALIZADO', horario_salida: ahora.toISOString() }
        : t
    ));
  };

  const handleClosePagoDigital = () => {
    if (!pagoDigitalExito && pagoDigitalProcesando) return;
    setOpenPagoDigital(false);
    setPagoDigitalProcesando(false);
    setPagoDigitalExito(false);
    setDatosPago({ telefono: '', email: '', referencia: '' });
  };

  const handleCloseTicketLiquidacion = () => {
    setTicketLiquidacion(null);
    setSelectedTicket(null);
    setLiquidacion(null);
    setCalculatedIva(null);
  };

  const handlePrintLiquidacion = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateTime = (ingreso: string, salida?: string) => {
    const start = new Date(ingreso);
    const end = salida ? new Date(salida) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontFamily: 'Outfit', fontWeight: 700 }}>Gestion de Tickets</Typography>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField fullWidth placeholder="Buscar por placa o codigo..." value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }} size="small" />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>Registrar vehiculo</Button>
            </Grid>
          </Grid>
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Todos (${tickets.length})`} />
          <Tab label={`Activos (${tickets.filter(t => t.estado === 'ACTIVO').length})`} />
          <Tab label={`Finalizados (${tickets.filter(t => t.estado === 'FINALIZADO').length})`} />
        </Tabs>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <ScannerDevice
            connectedDevice={scanner.connectedDevice}
            isConnecting={scanner.isConnecting}
            isScanning={scanner.isScanning}
            error={scanner.error}
            onConnect={scanner.scanDevice}
            onDisconnect={scanner.disconnectDevice}
            onStartScan={scanner.startScan}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <PrinterDevice
            connectedPrinter={printer.connectedPrinter}
            isConnecting={printer.isConnecting}
            isPrinting={printer.isPrinting}
            error={printer.error}
            onConnect={printer.connectPrinter}
            onDisconnect={printer.disconnectPrinter}
            onPrintTest={printer.printTest}
          />
        </Grid>
      </Grid>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Codigo</TableCell>
                <TableCell>Placa</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Espacio</TableCell>
                <TableCell>Hora Ingreso</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell><code>{ticket.codigo_barras}</code></TableCell>
                  <TableCell>{ticket.placa}</TableCell>
                  <TableCell>{ticket.tipo_vehiculo}</TableCell>
                  <TableCell>{ticket.espacio_id}</TableCell>
                  <TableCell>{new Date(ticket.horario_ingreso).toLocaleString('es-CO')}</TableCell>
                  <TableCell><Chip label={ticket.estado} color={getStatusColor(ticket.estado) as any} size="small" /></TableCell>
                  <TableCell align="center">
                    {ticket.estado === 'ACTIVO' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<ExitToApp />}
                        onClick={() => handleOpenLiquidacion(ticket)}
                      >
                        Liquidar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Registrar vehiculo</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Placa del Vehiculo"
              value={newTicket.placa}
              onChange={(e) => setNewTicket({ ...newTicket, placa: e.target.value.toUpperCase() })}
              fullWidth
              autoFocus
              placeholder="ABC-123"
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Vehiculo</InputLabel>
              <Select
                value={newTicket.tipo_vehiculo}
                label="Tipo de Vehiculo"
                onChange={(e) => setNewTicket({ ...newTicket, tipo_vehiculo: e.target.value })}
              >
                <MenuItem value="Automovil">Automovil</MenuItem>
                <MenuItem value="Motocicleta">Motocicleta</MenuItem>
                <MenuItem value="Camioneta">Camioneta</MenuItem>
                <MenuItem value="Discapacitados">Discapacitados</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Notas (opcional)"
              value={newTicket.notas}
              onChange={(e) => setNewTicket({ ...newTicket, notas: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || !newTicket.placa.trim()}
          >
            {saving ? <CircularProgress size={24} /> : 'Registrar Entrada'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openTicketDialog} onClose={handleCloseTicketDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: 'success.main' }}>Ticket de Ingreso</Typography>
            <IconButton onClick={handleCloseTicketDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {createdTicket && (
            <Box
              sx={{
                border: '3px solid #1e40af',
                borderRadius: 3,
                p: 3,
                mt: 1,
                bgcolor: '#fff',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
                <LocalParking sx={{ color: '#1e40af', fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e40af' }}>
                  PARKPRO
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 1 }}>TICKET DE INGRESO</Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={1} sx={{ textAlign: 'left' }}>
                <Grid item xs={5}>
                  <Typography variant="body2" color="text.secondary">Fecha:</Typography>
                </Grid>
                <Grid item xs={7}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af' }}>
                    {new Date(createdTicket.horario_ingreso).toLocaleDateString('es-CO')}
                  </Typography>
                </Grid>
                <Grid item xs={5}>
                  <Typography variant="body2" color="text.secondary">Hora:</Typography>
                </Grid>
                <Grid item xs={7}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af' }}>
                    {new Date(createdTicket.horario_ingreso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Grid>
                <Grid item xs={5}>
                  <Typography variant="body2" color="text.secondary">Placa:</Typography>
                </Grid>
                <Grid item xs={7}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e40af' }}>{createdTicket.placa}</Typography>
                </Grid>
                <Grid item xs={5}>
                  <Typography variant="body2" color="text.secondary">Tipo:</Typography>
                </Grid>
                <Grid item xs={7}>
                  <Typography variant="body2" sx={{ color: '#1e40af' }}>{createdTicket.tipo_vehiculo}</Typography>
                </Grid>
                <Grid item xs={5}>
                  <Typography variant="body2" color="text.secondary">Espacio:</Typography>
                </Grid>
                <Grid item xs={7}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#22c55e' }}>{createdTicket.espacio_id}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, display: 'inline-block' }}>
                <Barcode value={createdTicket.codigo_barras} width={1.4} height={50} fontSize={16} />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                Conserve este ticket para el retiro de su vehiculo
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                No nos hacemos responsables por objetos dejados en el vehiculo.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Gracias por preferirnos
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 1 }}>
          <Button startIcon={<ContentCopy />} onClick={copyToClipboard}>
            Copiar
          </Button>
          <Button startIcon={<Print />} onClick={handlePrintTicket}>
            Imprimir
          </Button>
          {printer.connectedPrinter && (
            <Tooltip title="Imprimir en impresora térmica">
              <Button startIcon={<PrintIcon />} onClick={handlePrintToThermal} variant="contained" color="success">
                Imprimir Ticket
              </Button>
            </Tooltip>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={openLiquidacionDialog} onClose={handleCloseLiquidacion} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#eab308' }}>Liquidacion de Parqueadero</Typography>
            <IconButton onClick={handleCloseLiquidacion} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {selectedTicket && liquidacion && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color='#64748b'>PLACA</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af' }}>{selectedTicket.placa}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">HORA DE INGRESO</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(selectedTicket.horario_ingreso).toLocaleString('es-CO')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">HORA DE SALIDA</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date().toLocaleString('es-CO')}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">TIEMPO TRANSCURRIDO</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {calculateTime(selectedTicket.horario_ingreso)} ({liquidacion.horas} hora{liquidacion.horas !== 1 ? 's' : ''})
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                  </Grid>

                  <Grid item xs={8}>
                    <Typography>Subtotal</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography>{formatCurrency(calculatedIva?.subtotal || 0)}</Typography>
                  </Grid>

                  <Grid item xs={8}>
                    <Typography>IVA (19%)</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography>{formatCurrency(calculatedIva?.iva || 0)}</Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  <Grid item xs={8}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "text-secondary" }}>TOTAL A PAGAR</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#22c55e' }}>
                      {formatCurrency(liquidacion.monto)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={esEmpleado}
                          onChange={(e) => handleEsEmpleadoChange(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography sx={{ fontWeight: 500 }}>
                          Vehiculo de empleado (Tarifa fija: {formatCurrency(TARIFA_EMPLEADO)})
                        </Typography>
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <FormControl fullWidth>
                      <InputLabel>Metodo de Pago</InputLabel>
                      <Select
                        value={metodoPago}
                        label="Metodo de Pago"
                        onChange={(e) => setMetodoPago(e.target.value)}
                      >
                        <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                        <MenuItem value="TARJETA_DEBITO">Tarjeta Debito</MenuItem>
                        <MenuItem value="TARJETA_CREDITO">Tarjeta Credito</MenuItem>
                        <MenuItem value="NEQUI">Nequi</MenuItem>
                        <MenuItem value="DAVIPLATA">Daviplata</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseLiquidacion}>Cancelar</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleProcesarSalida}
            disabled={!liquidacion}
          >
            Confirmar Salida
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!ticketLiquidacion} onClose={handleCloseTicketLiquidacion} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#eab308' }}>Ticket de Liquidacion</Typography>
            <IconButton onClick={handleCloseTicketLiquidacion} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {ticketLiquidacion && (
            <Box
              sx={{
                border: '3px solid #eab308',
                borderRadius: 3,
                p: 3,
                mt: 1,
                bgcolor: '#fff',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
                <LocalParking sx={{ color: '#eab308', fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#eab308' }}>
                  PARKPRO
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 1 }}>TICKET DE LIQUIDACION</Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={1} sx={{ textAlign: 'left', pl: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Placa:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e40af' }}>{ticketLiquidacion.placa}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Tipo:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color='#1e40af'>{ticketLiquidacion.tipo_vehiculo}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Hora Ingreso:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color='#1e40af'>
                    {new Date(ticketLiquidacion.hora_ingreso).toLocaleString('es-CO')}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Hora Salida:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color='#1e40af'>
                    {new Date(ticketLiquidacion.hora_salida).toLocaleString('es-CO')}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Tiempo:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af' }}>{ticketLiquidacion.horas} hora(s)</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={1} sx={{ textAlign: 'left' }}>
                <Grid item xs={6}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Total a Pagar:</Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#22c55e' }}>
                    {formatCurrency(ticketLiquidacion.total)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Metodo de Pago:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{ticketLiquidacion.metodo_pago}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                Gracias por preferirnos
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 1 }}>
          <Button startIcon={<Print />} onClick={handlePrintLiquidacion} variant="contained" color="warning">
            Imprimir Ticket
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPagoDigital} onClose={handleClosePagoDigital} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {pagoDigitalExito ? 'Pago Exitoso' : `Pago con ${metodoPago}`}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!pagoDigitalProcesando && !pagoDigitalExito && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              </Typography>
              Ingrese los datos para completar la transaccion con {metodoPago}

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Numero de Teléfono"
                    value={datosPago.telefono}
                    onChange={(e) => setDatosPago({ ...datosPago, telefono: e.target.value })}
                    placeholder="300 123 4567"
                    helperText={`Numero asociado a su cuenta de ${metodoPago}`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email (opcional)"
                    type="email"
                    value={datosPago.email}
                    onChange={(e) => setDatosPago({ ...datosPago, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Referencia de Pago (opcional)"
                    value={datosPago.referencia}
                    onChange={(e) => setDatosPago({ ...datosPago, referencia: e.target.value })}
                    placeholder="Número de referencia o nota"
                  />
                </Grid>
              </Grid>

              {liquidacion && (
                <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">Monto a pagar:</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#22c55e' }}>
                    {formatCurrency(liquidacion.monto)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {pagoDigitalProcesando && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Procesando pago...</Typography>
              <Typography variant="body2" color="text.secondary">
              </Typography>
              Escanee el codigo QR con su app de {metodoPago}
              <Box sx={{
                mt: 3,
                p: 2,
                border: '2px dashed #333',
                borderRadius: 2,
                display: 'inline-block',
                bgcolor: '#fff'
              }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 }}>
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 }}>
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 }}>
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 }}>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  Codigo: PP-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                </Typography>
              </Box>
              {liquidacion && (
                <Typography variant="h5" sx={{ mt: 2, fontWeight: 700 }}>
                  {formatCurrency(liquidacion.monto)}
                </Typography>
              )}
            </Box>
          )}

          {pagoDigitalExito && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }}>
                <Typography variant="h3" sx={{ color: '#fff' }}>a</Typography>
              </Box>
              <Typography variant="h6" sx={{ mb: 1 }}>Pago confirmado</Typography>
              <Typography variant="body2" color="text.secondary">
                El pago se ha procesado exitosamente
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">Telefono:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{datosPago.telefono}</Typography>
                {datosPago.email && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Email:</Typography>
                    <Typography variant="body1">{datosPago.email}</Typography>
                  </>
                )}
                {datosPago.referencia && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Referencia:</Typography>
                    <Typography variant="body1">{datosPago.referencia}</Typography>
                  </>
                )}
              </Box>
              {liquidacion && (
                <Typography variant="h5" sx={{ mt: 2, fontWeight: 700, color: '#22c55e' }}>
                  {formatCurrency(liquidacion.monto)}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          {pagoDigitalExito ? (
            <Button variant="contained" onClick={confirmarSalida}>
              Continuar
            </Button>
          ) : (
            <>
              <Button variant="outlined" onClick={handleClosePagoDigital}>
                Cancelar
              </Button>
              {!pagoDigitalProcesando && (
                <Button variant="contained" onClick={handleIniciarPagoDigital}>
                  Iniciar Pago
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}