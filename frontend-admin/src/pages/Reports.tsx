import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, MenuItem, Select, FormControl, InputLabel, Tabs, Tab, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Alert } from '@mui/material';
import { Download, Assessment, PictureAsPdf, TableChart, Person, Close, Print, Lock } from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { reportsApi, espaciosEmpleadosApi } from '../services/api';
import { useAuth } from '../store/AuthContext';

interface TurnReport {
  turno: string;
  horaInicio: string;
  horaFin: string;
  entradas: number;
  salidas: number;
  ingresos: number;
  efectivo: number;
  datafono: number;
  nequi: number;
  daviplata: number;
  bancolombia: number;
}

interface ResumenGeneral {
  totalTickets: number;
  ticketsActivos: number;
  ticketsFinalizados: number;
  ingresosDia: number;
  ingresosMes: number;
  pagosPorMetodo: Record<string, number>;
}

interface Closure {
  id: number;
  operador?: { nombre: string };
  operador_id?: number;
  fecha_inicio: string;
  fecha_fin: string;
  total_efectivo: number;
  total_datafono: number;
  total_nequi: number;
  total_daviplata: number;
  total_bancolombia: number;
  supervisor_valida?: number;
}

interface NominaItem {
  id: number;
  tipoRegistro?: string;
  empleado: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    cedula?: string;
  };
  espacio: {
    id: string;
    tipo: string;
    estado: string;
    seccion?: string;
    numero?: number;
  };
  porcentajeDescuento: number;
  fechaInicio: string;
  activo: boolean;
}

const mockPaymentData = [
  { name: 'Efectivo', value: 0, color: '#22c55e' },
  { name: 'Datáfono', value: 0, color: '#3b82f6' },
  { name: 'Nequi', value: 0, color: '#f97316' },
  { name: 'Daviplata', value: 0, color: '#8b5cf6' },
  { name: 'Bancolombia', value: 0, color: '#06b6d4' },
];

export default function Reports() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [reportType, setReportType] = useState('diario');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportFormat, setExportFormat] = useState('pdf');

  const [resumen, setResumen] = useState<ResumenGeneral | null>(null);
  const [loadingResumen, setLoadingResumen] = useState(false);

  const [turnReports, setTurnReports] = useState<TurnReport[]>([]);
  const [loadingTurns, setLoadingTurns] = useState(false);

  const [closures, setClosures] = useState<Closure[]>([]);
  const [loadingClosures, setLoadingClosures] = useState(false);

  const [nominaData, setNominaData] = useState<NominaItem[]>([]);
  const [loadingNomina, setLoadingNomina] = useState(false);
  const [nominaFechaInicio, setNominaFechaInicio] = useState('');
  const [nominaFechaFin, setNominaFechaFin] = useState('');

  const [openCierreDialog, setOpenCierreDialog] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState<{ nombre: string; inicio: string; fin: string } | null>(null);
  const [turnoData, setTurnoData] = useState<any>(null);
  const [observaciones, setObservaciones] = useState('');
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [cierreError, setCierreError] = useState('');
  const [cierreGuardado, setCierreGuardado] = useState<any>(null);

  const fetchResumen = async () => {
    try {
      setLoadingResumen(true);
      const response = await reportsApi.getResumen();
      setResumen(response.data);
    } catch (err) {
      console.error('Error fetching resumen', err);
    } finally {
      setLoadingResumen(false);
    }
  };

  const handleGenerateReport = () => {
    if (tab === 0) {
      fetchResumen();
    } else if (tab === 1) {
      fetchClosures();
    } else if (tab === 2) {
      fetchTurnReports();
    } else if (tab === 3) {
      fetchNomina();
    }
  };

  const fetchTurnReports = async () => {
    try {
      setLoadingTurns(true);
      const response = await reportsApi.getDailyByTurn(date);
      setTurnReports(response.data.turnos || []);
    } catch (err) {
      console.error('Error fetching turn reports', err);
      setTurnReports([]);
    } finally {
      setLoadingTurns(false);
    }
  };

  const fetchClosures = async () => {
    try {
      setLoadingClosures(true);
      const response = await reportsApi.getClosures();
      setClosures(response.data || []);
    } catch (err) {
      console.error('Error fetching closures', err);
      setClosures([]);
    } finally {
      setLoadingClosures(false);
    }
  };

  const fetchNomina = async () => {
    try {
      setLoadingNomina(true);
      console.log('fetchNomina - fechaInicio:', nominaFechaInicio, 'fechaFin:', nominaFechaFin);
      const response = await espaciosEmpleadosApi.getReporteNomina(nominaFechaInicio || undefined, nominaFechaFin || undefined);
      console.log('response completo:', response);
      console.log('response.data:', response.data);

      let data: any[] = [];

      if (response && response.data !== undefined) {
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (typeof response.data === 'object' && response.data !== null) {
          if (Array.isArray(response.data.data)) {
            data = response.data.data;
          } else if (Array.isArray(response.data.result)) {
            data = response.data.result;
          } else if (Array.isArray(response.data.items)) {
            data = response.data.items;
          }
        }
      }

      console.log('nominaData procesada:', data);
      setNominaData(data);
    } catch (err) {
      console.error('Error fetching nomina', err);
      setNominaData([]);
    } finally {
      setLoadingNomina(false);
    }
  };

  const loadNominaData = () => {
    fetchNomina();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getTurnosDelDia = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const turnos = [
      { nombre: 'Matutino', inicio: 6, fin: 14 },
      { nombre: 'Vespertino', inicio: 14, fin: 22 },
      { nombre: 'Nocturno', inicio: 22, fin: 6 },
    ];

    return turnos.map(t => {
      const inicio = new Date(today);
      inicio.setHours(t.inicio, 0, 0, 0);
      const fin = new Date(today);
      if (t.inicio > t.fin) {
        fin.setDate(fin.getDate() + 1);
      }
      fin.setHours(t.fin, 0, 0, 0);

      return {
        ...t,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        label: `${t.nombre} (${t.inicio}:00 - ${t.fin}:00)`,
      };
    });
  };

  const abrirCierreTurno = async (turno: any) => {
    setSelectedTurno(turno);
    setLoadingCierre(true);
    setCierreError('');
    setCierreGuardado(null);
    setObservaciones('');

    try {
      const response = await reportsApi.getDailyByTurn(date);
      const turnoDataApi = response.data.turnos?.find((t: any) => t.turno === turno.nombre);

      if (turnoDataApi) {
        setTurnoData(turnoDataApi);
      } else {
        setTurnoData({
          turno: turno.nombre,
          horaInicio: `${turno.inicio}:00`,
          horaFin: `${turno.fin}:00`,
          entradas: 0,
          salidas: 0,
          ingresos: 0,
          efectivo: 0,
          datafono: 0,
          nequi: 0,
          daviplata: 0,
          bancolombia: 0,
        });
      }

      setOpenCierreDialog(true);
    } catch (err) {
      console.error('Error al obtener datos del turno', err);
      setCierreError('Error al obtener datos del turno');
    } finally {
      setLoadingCierre(false);
    }
  };

  const guardarCierreTurno = async () => {
    if (!selectedTurno || !user) return;

    setLoadingCierre(true);
    setCierreError('');

    try {
      const response = await reportsApi.createClosure({
        fecha_inicio: selectedTurno.inicio,
        fecha_fin: selectedTurno.fin,
        observaciones: observaciones,
      });

      setCierreGuardado(response.data);
      fetchClosures();
    } catch (err: any) {
      console.error('Error al guardar cierre', err);
      setCierreError(err.response?.data?.message || 'Error al guardar el cierre de turno');
    } finally {
      setLoadingCierre(false);
    }
  };

  const imprimirCierre = () => {
    if (!turnoData || !selectedTurno) return;

    const total = (turnoData.total_efectivo || turnoData.efectivo || 0) +
      (turnoData.total_datafono || turnoData.datafono || 0) +
      (turnoData.total_nequi || turnoData.nequi || 0) +
      (turnoData.total_daviplata || turnoData.daviplata || 0) +
      (turnoData.total_bancolombia || turnoData.bancolombia || 0);

    const contenido = `
PARKPRO - CIERRE DE TURNO
=====================================
Fecha: ${new Date().toLocaleDateString('es-CO')}
Operador: ${user?.nombre || 'N/A'}
Turno: ${selectedTurno.nombre}
Horario: ${selectedTurno.inicio}:00 - ${selectedTurno.fin}:00
=====================================

RESUMEN DEL TURNO
-------------------------------------
Entradas: ${turnoData.entradas || 0}
Salidas: ${turnoData.salidas || 0}

INGRESOS POR METODO DE PAGO
-------------------------------------
Efectivo:      ${formatCurrency(turnoData.efectivo || 0)}
Datafono:      ${formatCurrency(turnoData.datafono || 0)}
Nequi:         ${formatCurrency(turnoData.nequi || 0)}
Daviplata:     ${formatCurrency(turnoData.daviplata || 0)}
Bancolombia:   ${formatCurrency(turnoData.bancolombia || 0)}
-------------------------------------
TOTAL TURNO:   ${formatCurrency(total)}

${observaciones ? `OBSERVACIONES:\n${observaciones}` : ''}

=====================================
Generado: ${new Date().toLocaleString('es-CO')}
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cierre de Turno - ParkPro</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; white-space: pre-wrap; font-size: 12px; }
              h1 { font-size: 18px; text-align: center; }
            </style>
          </head>
          <body>
            <pre>${contenido}</pre>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  useEffect(() => {
    if (tab === 0) {
      fetchResumen();
    } else if (tab === 1) {
      fetchClosures();
    } else if (tab === 2) {
      fetchTurnReports();
    } else if (tab === 3) {
      fetchNomina();
    }
  }, [tab, date, reportType, nominaFechaInicio, nominaFechaFin]);

  useEffect(() => {
    if (tab === 3 && nominaData.length === 0 && !loadingNomina) {
      fetchNomina();
    }
  }, [tab]);

  const paymentData = resumen ? [
    { name: 'Efectivo', value: resumen.pagosPorMetodo?.EFECTIVO || 0, color: '#22c55e' },
    { name: 'Datafono', value: (resumen.pagosPorMetodo?.TARJETA_DEBITO || 0) + (resumen.pagosPorMetodo?.TARJETA_CREDITO || 0) + (resumen.pagosPorMetodo?.DATAFONO || 0), color: '#3b82f6' },
    { name: 'Nequi', value: resumen.pagosPorMetodo?.NEQUI || 0, color: '#f97316' },
    { name: 'Daviplata', value: resumen.pagosPorMetodo?.DAVIPLATA || 0, color: '#8b5cf6' },
    { name: 'Bancolombia', value: resumen.pagosPorMetodo?.BANCOLOMBIA || 0, color: '#06b6d4' },
  ] : mockPaymentData;

  const totalIncome = paymentData.reduce((sum, p) => sum + p.value, 0);
  const totalTurnIncome = turnReports.reduce((sum, t) => sum + t.ingresos, 0);
  const totalTurnEntries = turnReports.reduce((sum, t) => sum + t.entradas, 0);
  const totalTurnExits = turnReports.reduce((sum, t) => sum + t.salidas, 0);

  const formatNumber = (value: number) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '');
  };

  const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const generateCSV = (rows: any[][], filename: string) => {
    const BOM = '\uFEFF';
    const csvContent = rows.map(row =>
      row.map(field => escapeCSVField(field)).join(';')
    ).join('\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const generatePDF = () => {
    const content = `
 PARKPRO - REPORTE ${reportType.toUpperCase()}
 Fecha: ${date}
 =========================================

 RESUMEN GENERAL
 ---------------------------------
 Total Tickets: ${resumen?.totalTickets || 0}
 Tickets Activos: ${resumen?.ticketsActivos || 0}
 Tickets Finalizados: ${resumen?.ticketsFinalizados || 0}

 INGRESOS
 ---------------------------------
 Ingresos del Dia: ${formatCurrency(resumen?.ingresosDia || 0)}
 Ingresos del Mes: ${formatCurrency(resumen?.ingresosMes || 0)}

 POR METODO DE PAGO:
 ${paymentData.map(p => `${p.name}: ${formatCurrency(p.value)}`).join('\n')}

 CIERRES DE TURNO:
 ${closures.map(c => `Fecha: ${c.fecha_inicio?.split('T')[0]} - Operador: ${c.operador?.nombre || c.operador_id} - Total: ${formatCurrency((c.total_efectivo || 0) + (c.total_datafono || 0) + (c.total_nequi || 0) + (c.total_daviplata || 0) + (c.total_bancolombia || 0))} - Estado: ${c.supervisor_valida ? 'VALIDADO' : 'CERRADO'}`).join('\n')}

 =========================================
 Generado el: ${new Date().toLocaleString('es-CO')}
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reporte ParkPro - ${date}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; white-space: pre-wrap; }
              h1 { color: #1e40af; }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
            <button onclick="window.print()">Imprimir</button>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const generateTurnPDF = () => {
    const content = `
PARKPRO - REPORTE DIARIO POR TURNO
Fecha: ${date}
=========================================

RESUMEN POR TURNO:
---------------------------------
${turnReports.map(t => `
TURNO ${t.turno.toUpperCase()} (${t.horaInicio} - ${t.horaFin})
  Entradas: ${t.entradas}
  Salidas: ${t.salidas}
  Ingresos: ${formatCurrency(t.ingresos)}
    Efectivo: ${formatCurrency(t.efectivo)}
    Datáfono: ${formatCurrency(t.datafono)}
    Nequi: ${formatCurrency(t.nequi)}
    Daviplata: ${formatCurrency(t.daviplata)}
    Bancolombia: ${formatCurrency(t.bancolombia)}
`).join('\n')}

---------------------------------
TOTALES DEL DIA:
  Entradas: ${totalTurnEntries}
  Salidas: ${totalTurnExits}
  Ingresos Totales: ${formatCurrency(totalTurnIncome)}

=========================================
Generado el: ${new Date().toLocaleString('es-CO')}
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reporte por Turno ParkPro - ${date}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; white-space: pre-wrap; }
              h1 { color: #1e40af; }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
            <button onclick="window.print()">Imprimir</button>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const generateExcel = () => {
    const rows: any[][] = [
      ['REPORTE PARKPRO - RESUMEN GENERAL', '', '', ''],
      [`Fecha: ${date}`, '', '', ''],
      [`Tipo: ${reportType}`, '', '', ''],
      ['', '', '', ''],
      ['RESUMEN GENERAL', '', '', ''],
      ['Total Tickets', resumen?.totalTickets || 0, '', ''],
      ['Tickets Activos', resumen?.ticketsActivos || 0, '', ''],
      ['Tickets Finalizados', resumen?.ticketsFinalizados || 0, '', ''],
      ['', '', '', ''],
      ['INGRESOS', '', '', ''],
      ['Ingresos del Dia', formatNumber(resumen?.ingresosDia || 0), '', ''],
      ['Ingresos del Mes', formatNumber(resumen?.ingresosMes || 0), '', ''],
      ['', '', '', ''],
      ['METODO DE PAGO', 'VALOR (COP)', '', ''],
      ...paymentData.map(p => [p.name, formatNumber(p.value), '', '']),
      ['', '', '', ''],
      ['TOTAL', formatNumber(totalIncome), '', ''],
      ['', '', '', ''],
      ['CIERRES DE TURNO', '', '', ''],
      ['ID', 'Operador', 'Fecha', 'Efectivo', 'Datafono', 'Nequi', 'Daviplata', 'Bancolombia', 'Total'],
      ...closures.map(c => [
        c.id || '',
        c.operador?.nombre || `Operador #${c.operador_id}` || '',
        c.fecha_inicio?.split('T')[0] || '',
        formatNumber(c.total_efectivo || 0),
        formatNumber(c.total_datafono || 0),
        formatNumber(c.total_nequi || 0),
        formatNumber(c.total_daviplata || 0),
        formatNumber(c.total_bancolombia || 0),
        formatNumber((c.total_efectivo || 0) + (c.total_datafono || 0) + (c.total_nequi || 0) + (c.total_daviplata || 0) + (c.total_bancolombia || 0))
      ]),
    ];

    generateCSV(rows, `reporte_parkpro_${date}.csv`);
  };

  const generateTurnExcel = () => {
    const rows: any[][] = [
      ['REPORTE DIARIO POR TURNO - PARKPRO', '', '', '', ''],
      [`Fecha: ${date}`, '', '', '', ''],
      ['', '', '', '', ''],
      ['TURNO', 'HORA INICIO', 'HORA FIN', 'ENTRADAS', 'SALIDAS', 'EFECTIVO', 'DATAFONO', 'NEQUI', 'DAVIPLATA', 'BANCOLOMBIA', 'TOTAL'],
      ...turnReports.map(t => [
        t.turno,
        t.horaInicio,
        t.horaFin,
        t.entradas,
        t.salidas,
        formatNumber(t.efectivo),
        formatNumber(t.datafono),
        formatNumber(t.nequi),
        formatNumber(t.daviplata),
        formatNumber(t.bancolombia),
        formatNumber(t.ingresos)
      ]),
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['TOTALES', '', '', totalTurnEntries, totalTurnExits,
        formatNumber(turnReports.reduce((s, t) => s + t.efectivo, 0)),
        formatNumber(turnReports.reduce((s, t) => s + t.datafono, 0)),
        formatNumber(turnReports.reduce((s, t) => s + t.nequi, 0)),
        formatNumber(turnReports.reduce((s, t) => s + t.daviplata, 0)),
        formatNumber(turnReports.reduce((s, t) => s + t.bancolombia, 0)),
        formatNumber(totalTurnIncome)
      ],
    ];

    generateCSV(rows, `reporte_turno_parkpro_${date}.csv`);
  };

  const handleExport = () => {
    if (tab === 2) {
      if (exportFormat === 'pdf') {
        generateTurnPDF();
      } else {
        generateTurnExcel();
      }
    } else {
      if (exportFormat === 'pdf') {
        generatePDF();
      } else {
        generateExcel();
      }
    }
  };

  const chartData = turnReports.map(t => ({
    name: t.turno,
    ingresos: t.ingresos,
    entradas: t.entradas,
    salidas: t.salidas,
  }));

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontFamily: 'Outfit', fontWeight: 700 }}>Reportes Gerenciales</Typography>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
            <Tab label="Resumen General" />
            <Tab label="Cierres de Turno" />
            <Tab label="Diario por Turno" />
            <Tab label="Nomina" />
          </Tabs>
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField type="date" label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />

          {tab === 0 && (
            <TextField select label="Tipo de Reporte" value={reportType} onChange={(e) => setReportType(e.target.value)} size="small" sx={{ minWidth: 200 }}>
              <MenuItem value="diario">Reporte Diario</MenuItem>
              <MenuItem value="semanal">Reporte Semanal</MenuItem>
              <MenuItem value="mensual">Reporte Mensual</MenuItem>
            </TextField>
          )}

          <Button variant="contained" startIcon={<Assessment />} onClick={handleGenerateReport}>Generar</Button>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Formato</InputLabel>
            <Select
              value={exportFormat}
              label="Formato"
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <MenuItem value="pdf">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PictureAsPdf fontSize="small" /> PDF
                </Box>
              </MenuItem>
              <MenuItem value="excel">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TableChart fontSize="small" /> Excel/CSV
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
            Exportar
          </Button>
        </Box>
      </Card>

      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Total Tickets</Typography>
                <Typography variant="h4">{loadingResumen ? <CircularProgress size={24} /> : (resumen?.totalTickets || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Tickets Activos</Typography>
                <Typography variant="h4" color="primary">{loadingResumen ? <CircularProgress size={24} /> : (resumen?.ticketsActivos || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Ingresos Hoy</Typography>
                <Typography variant="h5" color="success.main">{loadingResumen ? <CircularProgress size={24} /> : formatCurrency(resumen?.ingresosDia || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Ingresos Mes</Typography>
                <Typography variant="h5" color="warning.main">{loadingResumen ? <CircularProgress size={24} /> : formatCurrency(resumen?.ingresosMes || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Ingresos por Metodo de Pago</Typography>
                {loadingResumen ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {paymentData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>Total: {formatCurrency(totalIncome)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Cierres de Turno Recientes</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Operador</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingClosures ? (
                        <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={20} /></TableCell></TableRow>
                      ) : closures.length === 0 ? (
                        <TableRow><TableCell colSpan={4} align="center">No hay cierres registrados</TableCell></TableRow>
                      ) : (
                        closures.slice(0, 5).map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.operador?.nombre || `Operador #${c.operador_id}`}</TableCell>
                            <TableCell>{c.fecha_inicio?.split('T')[0]}</TableCell>
                            <TableCell>{formatCurrency((c.total_efectivo || 0) + (c.total_datafono || 0) + (c.total_nequi || 0) + (c.total_daviplata || 0) + (c.total_bancolombia || 0))}</TableCell>
                            <TableCell><Chip label={c.supervisor_valida ? 'VALIDADO' : 'CERRADO'} color={c.supervisor_valida ? 'success' : 'default'} size="small" /></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6">Seleccionar Turno para Cerrar</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {getTurnosDelDia().map((turno) => (
                    <Button
                      key={turno.nombre}
                      variant="contained"
                      color="primary"
                      startIcon={<Lock />}
                      onClick={() => abrirCierreTurno(turno)}
                      disabled={loadingCierre}
                    >
                      Cerrar {turno.nombre}
                    </Button>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Operador</TableCell>
                    <TableCell>Fecha Inicio</TableCell>
                    <TableCell>Fecha Fin</TableCell>
                    <TableCell>Efectivo</TableCell>
                    <TableCell>Datafono</TableCell>
                    <TableCell>Nequi</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingClosures ? (
                    <TableRow><TableCell colSpan={9} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                  ) : closures.length === 0 ? (
                    <TableRow><TableCell colSpan={9} align="center">No hay cierres de turno registrados</TableCell></TableRow>
                  ) : (
                    closures.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.id}</TableCell>
                        <TableCell>{c.operador?.nombre || `Operador #${c.operador_id}`}</TableCell>
                        <TableCell>{c.fecha_inicio?.replace('T', ' ').substring(0, 16)}</TableCell>
                        <TableCell>{c.fecha_fin?.replace('T', ' ').substring(0, 16)}</TableCell>
                        <TableCell>{formatCurrency(c.total_efectivo || 0)}</TableCell>
                        <TableCell>{formatCurrency(c.total_datafono || 0)}</TableCell>
                        <TableCell>{formatCurrency(c.total_nequi || 0)}</TableCell>
                        <TableCell><strong>{formatCurrency((c.total_efectivo || 0) + (c.total_datafono || 0) + (c.total_nequi || 0) + (c.total_daviplata || 0) + (c.total_bancolombia || 0))}</strong></TableCell>
                        <TableCell><Chip label={c.supervisor_valida ? 'VALIDADO' : 'CERRADO'} color={c.supervisor_valida ? 'success' : 'default'} size="small" /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Resumen por Turno</Typography>
                {loadingTurns ? (
                  <Typography>Cargando...</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Turno</TableCell>
                          <TableCell>Horario</TableCell>
                          <TableCell>Entradas</TableCell>
                          <TableCell>Salidas</TableCell>
                          <TableCell>Ingresos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {turnReports.map((t) => (
                          <TableRow key={t.turno}>
                            <TableCell><strong>{t.turno}</strong></TableCell>
                            <TableCell>{t.horaInicio} - {t.horaFin}</TableCell>
                            <TableCell>{t.entradas}</TableCell>
                            <TableCell>{t.salidas}</TableCell>
                            <TableCell><strong>{formatCurrency(t.ingresos)}</strong></TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ '& td': { fontWeight: 'bold', bgcolor: '#f5f5f5' } }}>
                          <TableCell colSpan={2}>TOTALES</TableCell>
                          <TableCell>{totalTurnEntries}</TableCell>
                          <TableCell>{totalTurnExits}</TableCell>
                          <TableCell>{formatCurrency(totalTurnIncome)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Ingresos por Turno</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="ingresos" fill="#1e40af" name="Ingresos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Detalle por Metodo de Pago</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Turno</TableCell>
                        <TableCell>Efectivo</TableCell>
                        <TableCell>Datafono</TableCell>
                        <TableCell>Nequi</TableCell>
                        <TableCell>Daviplata</TableCell>
                        <TableCell>Bancolombia</TableCell>
                        <TableCell>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {turnReports.map((t) => (
                        <TableRow key={t.turno}>
                          <TableCell><strong>{t.turno}</strong></TableCell>
                          <TableCell>{formatCurrency(t.efectivo)}</TableCell>
                          <TableCell>{formatCurrency(t.datafono)}</TableCell>
                          <TableCell>{formatCurrency(t.nequi)}</TableCell>
                          <TableCell>{formatCurrency(t.daviplata)}</TableCell>
                          <TableCell>{formatCurrency(t.bancolombia)}</TableCell>
                          <TableCell><strong>{formatCurrency(t.ingresos)}</strong></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 3 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" /> Reporte de Nomina - Espacios para Empleados
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    type="date"
                    label="Fecha Inicio"
                    value={nominaFechaInicio}
                    onChange={(e) => setNominaFechaInicio(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    type="date"
                    label="Fecha Fin"
                    value={nominaFechaFin}
                    onChange={(e) => setNominaFechaFin(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button variant="contained" startIcon={<Assessment />} onClick={loadNominaData}>
                    Generar Reporte
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Empleado</TableCell>
                    <TableCell>Cedula</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Espacio</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descuento %</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingNomina ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : nominaData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">No hay espacios asignados a empleados</TableCell>
                    </TableRow>
                  ) : (
                    nominaData.map((item) => (
                      <TableRow key={item.id || item.espacio?.id}>
                        <TableCell>{item.id || item.espacio?.id || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{item.empleado?.nombre || '-'}</TableCell>
                        <TableCell>{item.empleado?.cedula || '-'}</TableCell>
                        <TableCell>{item.empleado?.email || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#8b5cf6' }}>
                          {item.espacio?.numero || item.espacio?.id || '-'}
                          {item.espacio?.seccion ? ` (${item.espacio.seccion})` : ''}
                        </TableCell>
                        <TableCell>{item.espacio?.tipo || '-'}</TableCell>
                        <TableCell>{item.porcentajeDescuento || 100}%</TableCell>
                        <TableCell>
                          <Chip
                            label={item.activo ? 'Activo' : 'Inactivo'}
                            color={item.activo ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => {
                const rows: any[][] = [
                  ['REPORTE DE NÓMINA - ESPACIOS PARA EMPLEADOS'],
                  [`Fecha de generación: ${new Date().toLocaleString('es-CO')}`],
                  [''],
                  ['ID', 'Empleado', 'Cedula', 'Email', 'Espacio', 'Seccion', 'Tipo', 'Descuento %', 'Estado'],
                  ...nominaData.map(item => [
                    item.id || item.espacio?.id || '',
                    item.empleado?.nombre || '',
                    item.empleado?.cedula || '',
                    item.empleado?.email || '',
                    item.espacio?.numero || item.espacio?.id || '',
                    item.espacio?.seccion || '',
                    item.espacio?.tipo || '',
                    item.porcentajeDescuento || 100,
                    item.activo ? 'Activo' : 'Inactivo'
                  ])
                ];

                generateCSV(rows, `reporte_nomina_empleados_${new Date().toISOString().split('T')[0]}.csv`);
              }}
            >
              Exportar CSV
            </Button>
          </Box>
        </Box>
      )}

      <Dialog open={openCierreDialog} onClose={() => !loadingCierre && setOpenCierreDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              <Lock sx={{ mr: 1, verticalAlign: 'middle' }} />
              Cierre de Turno - {selectedTurno?.nombre || ''}
            </Typography>
            <IconButton onClick={() => setOpenCierreDialog(false)} disabled={loadingCierre}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingCierre ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {cierreError && (
                <Alert severity="error" sx={{ mb: 2 }}>{cierreError}</Alert>
              )}

              {cierreGuardado && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Cierre guardado exitosamente con ID: {cierreGuardado.id}
                </Alert>
              )}

              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Resumen del Turno - {selectedTurno?.nombre}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="h4" color="primary">{turnoData?.entradas || 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Entradas</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="h4" color="secondary">{turnoData?.salidas || 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Salidas</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#1e40af', borderRadius: 1, color: 'white' }}>
                        <Typography variant="h4">{formatCurrency((turnoData?.efectivo || 0) + (turnoData?.datafono || 0) + (turnoData?.nequi || 0) + (turnoData?.daviplata || 0) + (turnoData?.bancolombia || 0))}</Typography>
                        <Typography variant="caption">Total Recaudado</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Detalle por Metodo de Pago
              </Typography>
              <TableContainer component={Card} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell><strong>Metodo</strong></TableCell>
                      <TableCell align="right"><strong>Monto</strong></TableCell>
                      <TableCell align="right"><strong>%</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const efectivo = Number(turnoData?.efectivo) || 0;
                      const datafono = Number(turnoData?.datafono) || 0;
                      const nequi = Number(turnoData?.nequi) || 0;
                      const daviplata = Number(turnoData?.daviplata) || 0;
                      const bancolombia = Number(turnoData?.bancolombia) || 0;
                      const total = efectivo + datafono + nequi + daviplata + bancolombia;
                      const calcPercent = (value: number) => total > 0 && value > 0 ? Math.round((value / total) * 100) : 0;
                      return (
                        <>
                          <TableRow>
                            <TableCell>Efectivo</TableCell>
                            <TableCell align="right">{formatCurrency(efectivo)}</TableCell>
                            <TableCell align="right">{calcPercent(efectivo)}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Datafono</TableCell>
                            <TableCell align="right">{formatCurrency(datafono)}</TableCell>
                            <TableCell align="right">{calcPercent(datafono)}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Nequi</TableCell>
                            <TableCell align="right">{formatCurrency(nequi)}</TableCell>
                            <TableCell align="right">{calcPercent(nequi)}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Daviplata</TableCell>
                            <TableCell align="right">{formatCurrency(daviplata)}</TableCell>
                            <TableCell align="right">{calcPercent(daviplata)}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Bancolombia</TableCell>
                            <TableCell align="right">{formatCurrency(bancolombia)}</TableCell>
                            <TableCell align="right">{calcPercent(bancolombia)}%</TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                    <TableRow sx={{ bgcolor: '#1e40af', color: 'white' }}>
                      <TableCell><strong>TOTAL</strong></TableCell>
                      <TableCell align="right"><strong>{formatCurrency((turnoData?.efectivo || 0) + (turnoData?.datafono || 0) + (turnoData?.nequi || 0) + (turnoData?.daviplata || 0) + (turnoData?.bancolombia || 0))}</strong></TableCell>
                      <TableCell align="right"><strong>100%</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <TextField
                label="Observaciones"
                multiline
                rows={3}
                fullWidth
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones del turno (opcional)"
                sx={{ mt: 2 }}
                disabled={!!cierreGuardado}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCierreDialog(false)} disabled={loadingCierre}>
            {cierreGuardado ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!cierreGuardado && (
            <>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={imprimirCierre}
                disabled={loadingCierre}
              >
                Imprimir
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Lock />}
                onClick={guardarCierreTurno}
                disabled={loadingCierre}
              >
                {loadingCierre ? 'Guardando...' : 'Guardar Cierre'}
              </Button>
            </>
          )}
          {cierreGuardado && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Print />}
              onClick={imprimirCierre}
            >
              Imprimir Comprobante
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
