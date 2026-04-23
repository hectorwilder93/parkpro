import { useState, useEffect } from 'react';
import { Box, Card, Typography, TextField, Button, Grid, Divider, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tabs, Tab, MenuItem, CircularProgress, FormControl, InputLabel, Select, Tooltip, InputAdornment } from '@mui/material';
import { Save, Add, Close, Delete, Edit, Person, Download, DirectionsCar, TwoWheeler, Air, Accessible, Search, Assignment } from '@mui/icons-material';
import { spacesApi, configuracionApi, espaciosEmpleadosApi, usersApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface Space {
  id: string;
  numero: number;
  piso?: number;
  seccion: string;
  tipo_permitido: string;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'RESERVADO' | 'MANTENIMIENTO';
  es_para_empleado?: boolean;
  empleado_asignado_id?: number;
  empleadoAsignado?: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    cedula?: string;
  };
}

interface EspacioEmpleado {
  id: number;
  espacio_id: string;
  cedula: string;
  porcentaje_descuento: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin?: string;
  espacio?: {
    id: string;
    tipo_permitido: string;
    estado: string;
  };
  empleado?: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    cedula: string;
  };
}

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  cedula?: string;
}

interface Settings {
  autoTariff: number;
  motoTariff: number;
  vanTariff: number;
  discTariff: number;
  maxDay: number;
  openingTime: string;
  closingTime: string;
  companyName: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  descuentoEmpleadoPredeterminado: number;
}

const defaultSettings: Settings = {
  autoTariff: 10000,
  motoTariff: 3000,
  vanTariff: 10000,
  discTariff: 0,
  maxDay: 10000,
  openingTime: '06:00',
  closingTime: '22:00',
  companyName: 'ParkPro SAS',
  nit: '900.123.456-7',
  address: 'Calle 123 # 45-67',
  phone: '300 123 4567',
  email: 'contacto@parkpro.com',
  descuentoEmpleadoPredeterminado: 90,
};

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const [saved, setSaved] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [tab, setTab] = useState(0);

  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [openSpaceDialog, setOpenSpaceDialog] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [spaceForm, setSpaceForm] = useState({
    id: '',
    numero: 1,
    seccion: 'A',
    tipo_permitido: 'Automovil',
    estado: 'DISPONIBLE',
  });
  const [spaceError, setSpaceError] = useState('');

  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<User[]>([]);
  const [asignaciones, setAsignaciones] = useState<EspacioEmpleado[]>([]);
  const [asignacionesMap, setAsignacionesMap] = useState<Map<string, EspacioEmpleado>>(new Map());
  const [espaciosAsignacionesMap, setEspaciosAsignacionesMap] = useState<Map<string, EspacioEmpleado>>(new Map());
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false);
  const [openAsignacionDialog, setOpenAsignacionDialog] = useState(false);
  const [editingAsignacion, setEditingAsignacion] = useState<EspacioEmpleado | null>(null);
  const [asignacionForm, setAsignacionForm] = useState({
    espacio_id: '',
    cedula: '',
    nombre: '',
    esNuevoEmpleado: false,
    porcentaje_descuento: 100,
  });
  const [asignacionError, setAsignacionError] = useState('');
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    cedula: '',
    nombre: '',
    espacio_id: '',
    tipo_vehiculo: 'Automovil',
    porcentaje_descuento: 100,
  });
  const [employeeError, setEmployeeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openExpandDialog, setOpenExpandDialog] = useState(false);
  const [expandForm, setExpandForm] = useState({ cantidad: 1, tipo: 'Automovil' });
  const [expandError, setExpandError] = useState('');
  const [allEmpleados, setAllEmpleados] = useState<User[]>([]);
  const [filteredEmpleados, setFilteredEmpleados] = useState<User[]>([]);
  const [searchCedula, setSearchCedula] = useState('');
  const [openEditEmployeeDialog, setOpenEditEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState({ nombre: '', cedula: '' });
  const [editEmployeeError, setEditEmployeeError] = useState('');

  const fetchConfiguracion = async () => {
    try {
      setLoadingConfig(true);
      const response = await configuracionApi.get();
      if (response.data) {
        setSettings({ ...defaultSettings, ...response.data });
      }
    } catch (err) {
      console.error('Error fetching configuracion', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchSpaces = async () => {
    try {
      setLoadingSpaces(true);
      const response = await spacesApi.getAll();
      setSpaces(response.data);
    } catch (err) {
      console.error('Error fetching spaces', err);
    } finally {
      setLoadingSpaces(false);
    }
  };

  useEffect(() => {
    if (tab === 1) {
      fetchSpaces();
    }
    if (tab === 2) {
      fetchEmpleados();
      fetchAsignaciones();
      fetchSpaces();
    }
  }, [tab]);

  const fetchEmpleados = async () => {
    try {
      const response = await usersApi.getAll();
      const operadoresActivos = response.data.filter((u: User) => u.activo && u.rol === 'Operador');
      setEmpleadosDisponibles(operadoresActivos);
      setAllEmpleados(response.data.filter((u: User) => u.activo));
      setFilteredEmpleados(response.data.filter((u: User) => u.activo));
    } catch (err) {
      console.error('Error fetching empleados', err);
    }
  };

  useEffect(() => {
    if (searchCedula.trim() === '') {
      setFilteredEmpleados(allEmpleados);
    } else {
      const term = searchCedula.toLowerCase().trim();
      setFilteredEmpleados(allEmpleados.filter(u =>
        u.cedula?.toLowerCase().includes(term) ||
        u.nombre?.toLowerCase().includes(term)
      ));
    }
  }, [searchCedula, allEmpleados]);

  const handleOpenEditEmployee = (empleado: User) => {
    setEditingEmployee(empleado);
    setEditEmployeeForm({ nombre: empleado.nombre, cedula: empleado.cedula || '' });
    setEditEmployeeError('');
    setOpenEditEmployeeDialog(true);
  };

  const handleCloseEditEmployee = () => {
    setOpenEditEmployeeDialog(false);
    setEditingEmployee(null);
    setEditEmployeeForm({ nombre: '', cedula: '' });
    setEditEmployeeError('');
  };

  const handleUpdateEmployee = async () => {
    if (!editEmployeeForm.nombre.trim()) {
      setEditEmployeeError('El nombre es requerido');
      return;
    }

    try {
      await usersApi.update(editingEmployee!.id, {
        nombre: editEmployeeForm.nombre,
        cedula: editEmployeeForm.cedula,
      });
      handleCloseEditEmployee();
      fetchEmpleados();
    } catch (err: any) {
      setEditEmployeeError(err.response?.data?.message || 'Error al actualizar empleado');
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('¿Esta? seguro de eliminar este empleado? Esta accion no se puede deshacer.')) return;

    try {
      await usersApi.delete(id);
      fetchEmpleados();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar empleado');
    }
  };

  const fetchAsignaciones = async () => {
    try {
      setLoadingAsignaciones(true);
      const response = await espaciosEmpleadosApi.getAll();
      console.log('fetchAsignaciones - response:', response);
      console.log('fetchAsignaciones - response.data:', response?.data);

      if (response?.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.data || [];
        console.log('fetchAsignaciones - data procesada:', data);

        setAsignaciones(data);
        const cedulaMap = new Map<string, EspacioEmpleado>();
        const espacioMap = new Map<string, EspacioEmpleado>();

        data.forEach((a: EspacioEmpleado) => {
          console.log('Procesando asignacion:', a);
          if (a.activo && a.cedula) {
            const cedulaKey = a.cedula.trim();
            cedulaMap.set(cedulaKey, a);
            console.log('Mapa cedula: set(', cedulaKey, ')');
          }
          if (a.activo && a.espacio_id) {
            espacioMap.set(a.espacio_id, a);
            console.log('Mapa espacio: set(', a.espacio_id, ')');
          }
        });

        console.log('fetchAsignaciones - cedulaMap:', cedulaMap);
        console.log('fetchAsignaciones - espacioMap:', espacioMap);

        setAsignacionesMap(cedulaMap);
        setEspaciosAsignacionesMap(espacioMap);
      } else {
        console.log('fetchAsignaciones - Sin datos');
        setAsignaciones([]);
        setAsignacionesMap(new Map());
        setEspaciosAsignacionesMap(new Map());
      }
    } catch (err) {
      console.error('Error fetching asignaciones:', err);
      setAsignaciones([]);
      setAsignacionesMap(new Map());
      setEspaciosAsignacionesMap(new Map());
    } finally {
      setLoadingAsignaciones(false);
    }
  };

  const handleSave = async () => {
    try {
      await configuracionApi.save(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar configuracion');
    }
  };

  const handleOpenSpaceDialog = (space?: Space) => {
    if (space) {
      setEditingSpace(space);
      setSpaceForm({
        id: space.id,
        numero: space.numero,
        seccion: space.seccion,
        tipo_permitido: space.tipo_permitido,
        estado: space.estado,
      });
    } else {
      setEditingSpace(null);
      setSpaceForm({
        id: '',
        numero: 1,
        seccion: 'A',
        tipo_permitido: 'Automovil',
        estado: 'DISPONIBLE',
      });
    }
    setSpaceError('');
    setOpenSpaceDialog(true);
  };

  const handleCloseSpaceDialog = () => {
    setOpenSpaceDialog(false);
    setEditingSpace(null);
    setSpaceError('');
  };

  const handleSaveSpace = async () => {
    if (!spaceForm.id.trim()) {
      setSpaceError('El ID del espacio es requerido');
      return;
    }

    try {
      if (editingSpace) {
        await spacesApi.update(editingSpace.id, {
          numero: spaceForm.numero,
          seccion: spaceForm.seccion,
          tipo_permitido: spaceForm.tipo_permitido,
          estado: spaceForm.estado,
        });
      } else {
        await spacesApi.create(spaceForm);
      }
      handleCloseSpaceDialog();
      fetchSpaces();
    } catch (err: any) {
      setSpaceError(err.response?.data?.message || 'Error al guardar el espacio');
    }
  };

  const handleDeleteSpace = async (id: string) => {
    if (!confirm('¿Esta seguro de eliminar este espacio?')) return;

    try {
      await spacesApi.delete(id);
      fetchSpaces();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar el espacio');
    }
  };

  const handleCloseAsignacionDialog = () => {
    setOpenAsignacionDialog(false);
    setEditingAsignacion(null);
    setAsignacionError('');
  };

  const handleSaveAsignacion = async () => {
    if (!asignacionForm.espacio_id) {
      setAsignacionError('Debe seleccionar un espacio');
      return;
    }
    if (!asignacionForm.cedula) {
      setAsignacionError('Debe ingresar la cedula del empleado');
      return;
    }
    if (asignacionForm.esNuevoEmpleado && !asignacionForm.nombre.trim()) {
      setAsignacionError('Debe ingresar el nombre del empleado');
      return;
    }

    try {
      if (editingAsignacion) {
        await espaciosEmpleadosApi.update(editingAsignacion.id, {
          porcentaje_descuento: asignacionForm.porcentaje_descuento,
        });
      } else {
        await espaciosEmpleadosApi.create({
          espacio_id: asignacionForm.espacio_id,
          cedula: asignacionForm.cedula,
          nombre: asignacionForm.esNuevoEmpleado ? asignacionForm.nombre : undefined,
          porcentaje_descuento: asignacionForm.porcentaje_descuento,
        });
      }
      handleCloseAsignacionDialog();
      fetchAsignaciones();
      fetchSpaces();
      fetchEmpleados();
    } catch (err: any) {
      setAsignacionError(err.response?.data?.message || 'Error al guardar la asignacion');
    }
  };

  const handleDeactivateAsignacion = async (id: number) => {
    if (!confirm('¿Esta ¿seguro de desactivar esta asignacion?')) return;

    try {
      const asignacion = asignaciones.find(a => a.id === id);
      await espaciosEmpleadosApi.deactivate(id);

      if (asignacion?.espacio_id) {
        await spacesApi.update(asignacion.espacio_id, {
          estado: 'DISPONIBLE',
          es_para_empleado: false,
          empleado_asignado_id: null,
        });
      }

      fetchAsignaciones();
      fetchSpaces();
      fetchEmpleados();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al desactivar la asignacion');
    }
  };

  const getVehicleIcon = (tipo: string) => {
    switch (tipo) {
      case 'Motocicleta': return <TwoWheeler sx={{ fontSize: 14 }} />;
      case 'Camioneta': return <Air sx={{ fontSize: 14 }} />;
      case 'Discapacitados': return <Accessible sx={{ fontSize: 14 }} />;
      default: return <DirectionsCar sx={{ fontSize: 14 }} />;
    }
  };

  const handleOpenEmployeeDialog = () => {
    setEmployeeForm({
      cedula: '',
      nombre: '',
      espacio_id: '',
      tipo_vehiculo: 'Automovil',
      porcentaje_descuento: settings.descuentoEmpleadoPredeterminado
    });
    setEmployeeError('');
    setOpenEmployeeDialog(true);
  };

  const handleOpenAsignacionDialog = () => {
    setAsignacionForm({
      espacio_id: '',
      cedula: '',
      nombre: '',
      esNuevoEmpleado: false,
      porcentaje_descuento: settings.descuentoEmpleadoPredeterminado
    });
    setAsignacionError('');
    setOpenAsignacionDialog(true);
  };

  const handleCloseEmployeeDialog = () => {
    setOpenEmployeeDialog(false);
    setEmployeeForm({
      cedula: '',
      nombre: '',
      espacio_id: '',
      tipo_vehiculo: 'Automovil',
      porcentaje_descuento: settings.descuentoEmpleadoPredeterminado
    });
    setEmployeeError('');
    setIsSubmitting(false);
  };

  const handleRegisterAndAssign = async () => {
    if (isSubmitting) return;

    if (!employeeForm.cedula.trim() || !employeeForm.nombre.trim()) {
      setEmployeeError('Complete todos los datos del empleado');
      return;
    }
    if (!employeeForm.espacio_id) {
      setEmployeeError('Seleccione un espacio disponible');
      return;
    }

    setIsSubmitting(true);
    try {
      const userResponse = await usersApi.create({
        cedula: employeeForm.cedula,
        nombre: employeeForm.nombre,
        username: employeeForm.cedula,
        email: `${employeeForm.cedula}@parkpro.com`,
        password: employeeForm.cedula,
        rol: 'Operador',
        turno: 'Rotativo',
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      await espaciosEmpleadosApi.create({
        espacio_id: employeeForm.espacio_id,
        cedula: employeeForm.cedula,
        porcentaje_descuento: employeeForm.porcentaje_descuento,
      });

      await spacesApi.update(employeeForm.espacio_id, {
        estado: 'RESERVADO',
        es_para_empleado: true,
        empleado_asignado_id: userResponse.data.id,
      });

      handleCloseEmployeeDialog();
      fetchEmpleados();
      fetchAsignaciones();
      fetchSpaces();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Error al procesar la solicitud';
      setEmployeeError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Empleados - Parqueadero ParkPro', 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 14, 30);

    const tableData = asignaciones
      .filter(a => a.activo)
      .map((a, index) => [
        index + 1,
        a.empleado?.nombre || 'N/A',
        a.empleado?.cedula || a.cedula || 'N/A',
        a.espacio_id,
        a.empleado?.email || 'N/A',
        `${a.porcentaje_descuento}%`,
        a.activo ? 'Activo' : 'Inactivo',
      ]);

    autoTable(doc, {
      startY: 40,
      head: [['#', 'Nombre', 'Cedula', 'Espacio', 'Email', 'Descuento', 'Estado']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save('reporte_empleados_parqueadero.pdf');
  };

  const exportToExcel = () => {
    const headers = ['Nombre', 'Cedula', 'Espacio', 'Email', 'Descuento', 'Estado'];
    const data = asignaciones
      .filter(a => a.activo)
      .map(a => [
        a.empleado?.nombre || 'N/A',
        a.empleado?.cedula || a.cedula || 'N/A',
        a.espacio_id,
        a.empleado?.email || 'N/A',
        `${a.porcentaje_descuento}%`,
        a.activo ? 'Activo' : 'Inactivo',
      ]);

    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'reporte_empleados_parqueadero.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExpandSpaces = async () => {
    const cantidad = expandForm.cantidad;
    if (cantidad < 1 || cantidad > 50) {
      setExpandError('La cantidad debe estar entre 1 y 50');
      return;
    }

    try {
      const pisoEmpleados = spaces.filter(s => s.numero === 4);
      const ultimoId = pisoEmpleados.length > 0
        ? Math.max(...pisoEmpleados.map(s => {
          const match = s.id.match(/P4(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }))
        : 0;

      for (let i = 1; i <= cantidad; i++) {
        const nuevoNumero = ultimoId + i;
        const nuevoId = `P4${String(nuevoNumero).padStart(3, '0')}`;

        const existe = spaces.find(s => s.id === nuevoId);
        if (!existe) {
          await spacesApi.create({
            id: nuevoId,
            numero: 4,
            seccion: 'E',
            tipo_permitido: expandForm.tipo,
          });
        }
      }

      setOpenExpandDialog(false);
      setExpandForm({ cantidad: 1, tipo: 'Automovil' });
      setExpandError('');
      fetchSpaces();
    } catch (err: any) {
      setExpandError(err.response?.data?.message || 'Error al ampliar espacios');
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontFamily: 'Outfit', fontWeight: 700 }}>Configuracion</Typography>

      {saved && <Alert severity="success" sx={{ mb: 3 }}>Configuracion guardada correctamente</Alert>}

      <Card sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label="General" />
          <Tab label="Gestion de Espacios" />
          <Tab label="Empleados" />
        </Tabs>
      </Card>

      {tab === 0 && (
        loadingConfig ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Tarifas</Typography>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Tarifa Automovil (24 horas)" type="number" value={settings.autoTariff} onChange={(e) => setSettings({ ...settings, autoTariff: +e.target.value })} fullWidth />
                  <TextField label="Tarifa Motocicleta (24 horas)" type="number" value={settings.motoTariff} onChange={(e) => setSettings({ ...settings, motoTariff: +e.target.value })} fullWidth />
                  <TextField label="Tarifa Camioneta (24 horas)" type="number" value={settings.vanTariff} onChange={(e) => setSettings({ ...settings, vanTariff: +e.target.value })} fullWidth />
                  <TextField label="Tarifa Discapacitados (24 horas)" type="number" value={settings.discTariff} onChange={(e) => setSettings({ ...settings, discTariff: +e.target.value })} fullWidth />
                  <TextField label="Tarifa Empleado (24 horas)" type="number" value={Math.round(settings.autoTariff * settings.descuentoEmpleadoPredeterminado / 100)} fullWidth disabled helperText="Tarifa fija para empleados (calculada segun descuento)" />
                  <TextField
                    label="Descuento Predeterminado Empleados (%)"
                    type="number"
                    value={settings.descuentoEmpleadoPredeterminado}
                    onChange={(e) => setSettings({ ...settings, descuentoEmpleadoPredeterminado: +e.target.value })}
                    fullWidth
                    inputProps={{ min: 0, max: 100 }}
                    helperText="Porcentaje de descuento sobre tarifa Automovil para empleados (0-100%)"
                  />
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Horario de Operacion</Typography>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Hora de Apertura" type="time" value={settings.openingTime} onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
                  <TextField label="Hora de Cierre" type="time" value={settings.closingTime} onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
                </Box>
              </Card>

              <Card sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Datos de la Empresa</Typography>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Nombre de la Empresa" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} fullWidth />
                  <TextField label="NIT" value={settings.nit} onChange={(e) => setSettings({ ...settings, nit: e.target.value })} fullWidth />
                  <TextField label="Direccion" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} fullWidth />
                  <TextField label="Telefono" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} fullWidth />
                  <TextField label="Email" type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} fullWidth />
                </Box>
              </Card>
            </Grid>
          </Grid>
        )
      )}

      {tab === 1 && (
        <Box>
          {!isAdmin ? (
            <Alert severity="warning">
              No tiene permisos para gestionar espacios. Esta funcion esta reservada para administradores.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenSpaceDialog()}>
                  Agregar Espacio
                </Button>
              </Box>

              <Card>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Piso</TableCell>
                        <TableCell>Seccion</TableCell>
                        <TableCell>Tipo Permitido</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingSpaces ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">Cargando...</TableCell>
                        </TableRow>
                      ) : spaces.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">No hay espacios registrados</TableCell>
                        </TableRow>
                      ) : (
                        spaces.map((space) => (
                          <TableRow key={space.id}>
                            <TableCell>{space.id}</TableCell>
                            <TableCell>{space.numero}</TableCell>
                            <TableCell>{space.seccion}</TableCell>
                            <TableCell>{space.tipo_permitido}</TableCell>
                            <TableCell>
                              <Chip
                                label={space.estado}
                                color={
                                  space.estado === 'DISPONIBLE' ? 'success' :
                                    space.estado === 'OCUPADO' ? 'error' :
                                      space.estado === 'RESERVADO' ? 'warning' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" onClick={() => handleOpenSpaceDialog(space)}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteSpace(space.id)} disabled={space.estado === 'OCUPADO'}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </>
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" color="primary" startIcon={<Person />} onClick={handleOpenEmployeeDialog}>
                Registrar y Asignar
              </Button>
              <Button variant="outlined" color="secondary" startIcon={<Assignment />} onClick={handleOpenAsignacionDialog}>
                Asignar Espacio
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Download />} onClick={exportToPDF}>
                Exportar PDF
              </Button>
              <Button variant="outlined" startIcon={<Download />} onClick={exportToExcel}>
                Exportar CSV
              </Button>
            </Box>
          </Box>

          <Card sx={{ mb: 3 }}>
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Empleados Registrados</Typography>
                <TextField
                  size="small"
                  placeholder="Buscar por cedula o nombre..."
                  value={searchCedula}
                  onChange={(e) => setSearchCedula(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 280 }}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cedula</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Espacio Asignado</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEmpleados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          {searchCedula ? 'No se encontraron empleados con esa cedula o nombre' : 'No hay empleados registrados'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmpleados.map((emp) => {
                        const empCedula = emp.cedula?.trim() || '';
                        const asignacionActiva = asignacionesMap.get(empCedula);
                        return (
                          <TableRow key={emp.id}>
                            <TableCell>{emp.cedula || 'N/A'}</TableCell>
                            <TableCell>{emp.nombre}</TableCell>
                            <TableCell>
                              {asignacionActiva ? (
                                <Chip label={asignacionActiva.espacio_id} size="small" color="success" variant="filled" />
                              ) : (
                                <Chip label="Sin asignar" size="small" color="default" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={emp.activo ? 'Activo' : 'Inactivo'} size="small" color={emp.activo ? 'success' : 'error'} />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEditEmployee(emp)}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteEmployee(emp.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>

          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Asignaciones de Espacios</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cedula</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Espacio</TableCell>
                      <TableCell>Tipo Vehiï¿½culo</TableCell>
                      <TableCell>Descuento</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingAsignaciones ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">Cargando...</TableCell>
                      </TableRow>
                    ) : asignaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">No hay asignaciones registradas</TableCell>
                      </TableRow>
                    ) : (
                      asignaciones.map((asignacion) => (
                        <TableRow key={asignacion.id}>
                          <TableCell>{asignacion.cedula || asignacion.empleado?.cedula || 'N/A'}</TableCell>
                          <TableCell>{asignacion.empleado?.nombre || 'N/A'}</TableCell>
                          <TableCell>{asignacion.espacio_id}</TableCell>
                          <TableCell>{asignacion.espacio?.tipo_permitido || 'N/A'}</TableCell>
                          <TableCell>{asignacion.porcentaje_descuento}%</TableCell>
                          <TableCell>
                            <Chip label={asignacion.activo ? 'Activo' : 'Inactivo'} size="small" color={asignacion.activo ? 'success' : 'error'} />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleDeactivateAsignacion(asignacion.id)} disabled={!asignacion.activo}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>
        </Box>
      )}

      {tab === 0 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="large" startIcon={<Save />} onClick={handleSave}>
            Guardar Configuracion
          </Button>
        </Box>
      )}

      <Dialog open={openSpaceDialog} onClose={handleCloseSpaceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{editingSpace ? 'Editar Espacio' : 'Agregar Espacio'}</Typography>
            <IconButton onClick={handleCloseSpaceDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {spaceError && <Alert severity="error" sx={{ mb: 2 }}>{spaceError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="ID del Espacio"
              value={spaceForm.id}
              onChange={(e) => setSpaceForm({ ...spaceForm, id: e.target.value.toUpperCase() })}
              fullWidth
              disabled={!!editingSpace}
              placeholder="A01, B05, etc."
              helperText="Identificador unico del espacio (ej: A01, B12)"
            />
            <TextField
              label="Piso"
              type="number"
              value={spaceForm.numero}
              onChange={(e) => setSpaceForm({ ...spaceForm, numero: +e.target.value })}
              fullWidth
              inputProps={{ min: 1, max: 10 }}
            />
            <TextField
              label="Seccion"
              value={spaceForm.seccion}
              onChange={(e) => setSpaceForm({ ...spaceForm, seccion: e.target.value.toUpperCase() })}
              fullWidth
              placeholder="A, B, C, etc."
            />
            <TextField
              select
              label="Tipo Permitido"
              value={spaceForm.tipo_permitido}
              onChange={(e) => setSpaceForm({ ...spaceForm, tipo_permitido: e.target.value })}
              fullWidth
            >
              <MenuItem value="Automovil">Automovil</MenuItem>
              <MenuItem value="Motocicleta">Motocicleta</MenuItem>
              <MenuItem value="Camioneta">Camioneta</MenuItem>
              <MenuItem value="Discapacitados">Discapacitados</MenuItem>
            </TextField>
            <TextField
              select
              label="Estado"
              value={spaceForm.estado}
              onChange={(e) => setSpaceForm({ ...spaceForm, estado: e.target.value })}
              fullWidth
            >
              <MenuItem value="DISPONIBLE">Disponible</MenuItem>
              <MenuItem value="OCUPADO">Ocupado</MenuItem>
              <MenuItem value="RESERVADO">Reservado</MenuItem>
              <MenuItem value="MANTENIMIENTO">Mantenimiento</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseSpaceDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveSpace}>
            {editingSpace ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAsignacionDialog} onClose={handleCloseAsignacionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{editingAsignacion ? 'Editar Asignacion' : 'Asignar Espacio a Empleado'}</Typography>
            <IconButton onClick={handleCloseAsignacionDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {asignacionError && <Alert severity="error" sx={{ mb: 2 }}>{asignacionError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Espacio</InputLabel>
              <Select
                value={asignacionForm.espacio_id}
                label="Espacio"
                onChange={(e) => setAsignacionForm({ ...asignacionForm, espacio_id: e.target.value })}
                disabled={!!editingAsignacion}
              >
                {spaces
                  .filter(s => s.estado === 'DISPONIBLE')
                  .map((space) => {
                    const tieneAsignacion = espaciosAsignacionesMap.has(space.id);
                    return (
                      <MenuItem key={space.id} value={space.id} disabled={tieneAsignacion}>
                        {space.id} - Piso {space.numero}, Seccion {space.seccion} ({space.tipo_permitido})
                        {tieneAsignacion && ' [Ya asignado]'}
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>

            {!editingAsignacion && (
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button
                  variant={!asignacionForm.esNuevoEmpleado ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setAsignacionForm({ ...asignacionForm, esNuevoEmpleado: false, cedula: '', nombre: '' })}
                >
                  Empleado Existente
                </Button>
                <Button
                  variant={asignacionForm.esNuevoEmpleado ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setAsignacionForm({ ...asignacionForm, esNuevoEmpleado: true, cedula: '', nombre: '' })}
                >
                  Nuevo Empleado
                </Button>
              </Box>
            )}

            {asignacionForm.esNuevoEmpleado ? (
              <>
                <TextField
                  label="Cedula del Empleado"
                  value={asignacionForm.cedula}
                  onChange={(e) => setAsignacionForm({ ...asignacionForm, cedula: e.target.value })}
                  fullWidth
                  placeholder="Ej: 12345678"
                  helperText="Cedula de ciudadania del empleado"
                />
                <TextField
                  label="Nombre Completo"
                  value={asignacionForm.nombre}
                  onChange={(e) => setAsignacionForm({ ...asignacionForm, nombre: e.target.value })}
                  fullWidth
                  placeholder="Ej: Juan Perez"
                />
              </>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Empleado</InputLabel>
                <Select
                  value={asignacionForm.cedula}
                  label="Empleado"
                  onChange={(e) => setAsignacionForm({ ...asignacionForm, cedula: e.target.value })}
                >
                  {empleadosDisponibles.map((emp) => {
                    const yaAsignado = asignacionesMap.has(emp.cedula?.trim() || '');
                    return (
                      <MenuItem key={emp.id} value={emp.cedula || ''} disabled={yaAsignado}>
                        {emp.nombre} ({emp.cedula})
                        {yaAsignado && ' [Ya tiene espacio]'}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Porcentaje de Descuento"
              type="number"
              value={asignacionForm.porcentaje_descuento}
              onChange={(e) => setAsignacionForm({ ...asignacionForm, porcentaje_descuento: +e.target.value })}
              fullWidth
              inputProps={{ min: 0, max: 100 }}
              helperText="Porcentaje de descuento en el parqueadero (0-100)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAsignacionDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveAsignacion}>
            {editingAsignacion ? 'Actualizar' : 'Asignar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEmployeeDialog} onClose={handleCloseEmployeeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Registrar Empleado y Asignar Espacio</Typography>
            <IconButton onClick={handleCloseEmployeeDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {employeeError && <Alert severity="error" sx={{ mb: 2 }}>{employeeError}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Datos del Empleado</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Cedula"
                    value={employeeForm.cedula}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, cedula: e.target.value })}
                    fullWidth
                    placeholder="Ej: 12345678"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nombre Completo"
                    value={employeeForm.nombre}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, nombre: e.target.value })}
                    fullWidth
                    placeholder="Ej: Juan Perez"
                  />
                </Grid>
              </Grid>
            </Card>

            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Seleccionar Espacio</Typography>
              {spaces.filter(s => s.estado === 'DISPONIBLE').length === 0 ? (
                <Alert severity="warning">
                  No hay espacios disponibles. Todos los espacios estan ocupados o en mantenimiento.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 250, overflowY: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                  {spaces
                    .filter(s => s.estado === 'DISPONIBLE')
                    .map((space) => {
                      const isSelected = employeeForm.espacio_id === space.id;
                      const colors = {
                        bg: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.15)',
                        border: isSelected ? '#3b82f6' : '#22c55e',
                        text: isSelected ? '#1d4ed8' : '#16a34a',
                      };
                      return (
                        <Tooltip
                          key={space.id}
                          title={`${space.id} - P${space.numero}-${space.seccion} - ${space.tipo_permitido}`}
                          arrow
                        >
                          <Box
                            onClick={() => setEmployeeForm({ ...employeeForm, espacio_id: space.id })}
                            sx={{
                              width: 65,
                              height: 60,
                              border: `2px solid ${colors.border}`,
                              borderRadius: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: colors.bg,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { transform: 'scale(1.08)', boxShadow: 2 },
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, color: colors.text, fontSize: '0.75rem' }}>
                              {space.id}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: colors.text, opacity: 0.8 }}>
                              P{space.numero}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getVehicleIcon(space.tipo_permitido)}
                            </Box>
                          </Box>
                        </Tooltip>
                      );
                    })}
                </Box>
              )}
              {employeeForm.espacio_id && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#1e3a5f', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, color: 'white' }}>
                  <Box sx={{ p: 1, bgcolor: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0 }}>
                    <DirectionsCar sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'white' }}>
                      Espacio {employeeForm.espacio_id} seleccionado
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Seleccione el tipo de vehiculo que desea registrar para este empleado
                    </Typography>
                  </Box>
                </Box>
              )}
            </Card>

            <TextField
              select
              label="Tipo de Vehiï¿½culo del Empleado"
              value={employeeForm.tipo_vehiculo || 'Automovil'}
              onChange={(e) => setEmployeeForm({ ...employeeForm, tipo_vehiculo: e.target.value })}
              fullWidth
              disabled={!employeeForm.espacio_id}
              helperText="Seleccione el tipo de vehiï¿½culo que el empleado va a registrar"
            >
              <MenuItem value="Automovil">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DirectionsCar fontSize="small" /> Automovil
                </Box>
              </MenuItem>
              <MenuItem value="Motocicleta">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TwoWheeler fontSize="small" /> Motocicleta
                </Box>
              </MenuItem>
              <MenuItem value="Camioneta">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Air fontSize="small" /> Camioneta
                </Box>
              </MenuItem>
              <MenuItem value="Discapacitados">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Accessible fontSize="small" /> Discapacitados
                </Box>
              </MenuItem>
            </TextField>

            <TextField
              label="Porcentaje de Descuento"
              type="number"
              value={employeeForm.porcentaje_descuento}
              onChange={(e) => setEmployeeForm({ ...employeeForm, porcentaje_descuento: +e.target.value })}
              fullWidth
              inputProps={{ min: 0, max: 100 }}
              helperText="Porcentaje de descuento (0-100%)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseEmployeeDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleRegisterAndAssign}
            disabled={!employeeForm.cedula.trim() || !employeeForm.nombre.trim() || !employeeForm.espacio_id || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {isSubmitting ? 'Registrando...' : 'Registrar y Asignar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openExpandDialog} onClose={() => setOpenExpandDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Ampliar Piso 4 (Empleados)</Typography>
            <IconButton onClick={() => setOpenExpandDialog(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {expandError && <Alert severity="error" sx={{ mb: 2 }}>{expandError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Cantidad de Espacios"
              type="number"
              value={expandForm.cantidad}
              onChange={(e) => setExpandForm({ ...expandForm, cantidad: parseInt(e.target.value) || 1 })}
              fullWidth
              inputProps={{ min: 1, max: 50 }}
              helperText="Cantidad de espacios a agregar (max. 50)"
            />
            <TextField
              select
              label="Tipo de Vehiculo"
              value={expandForm.tipo}
              onChange={(e) => setExpandForm({ ...expandForm, tipo: e.target.value })}
              fullWidth
            >
              <MenuItem value="Automovil">Automovil</MenuItem>
              <MenuItem value="Motocicleta">Motocicleta</MenuItem>
              <MenuItem value="Camioneta">Camioneta</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenExpandDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleExpandSpaces}>
            Ampliar Espacios
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditEmployeeDialog} onClose={handleCloseEditEmployee} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Editar Empleado</Typography>
            <IconButton onClick={handleCloseEditEmployee} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {editEmployeeError && <Alert severity="error" sx={{ mb: 2 }}>{editEmployeeError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Cedula"
              value={editEmployeeForm.cedula}
              onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, cedula: e.target.value })}
              fullWidth
              disabled
              helperText="La cedula no se puede modificar"
            />
            <TextField
              label="Nombre Completo"
              value={editEmployeeForm.nombre}
              onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, nombre: e.target.value })}
              fullWidth
              placeholder="Ej: Juan Perez"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseEditEmployee}>Cancelar</Button>
          <Button variant="contained" onClick={handleUpdateEmployee}>
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
}
