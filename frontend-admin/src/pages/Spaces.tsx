import { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, ToggleButton, ToggleButtonGroup, Chip, Dialog, DialogTitle, DialogContent, IconButton, Tooltip, Fade } from '@mui/material';
import { Close, DirectionsCar, TwoWheeler, Air, Accessible, AccessTime, ConfirmationNumber, Person } from '@mui/icons-material';
import { spacesApi, ticketsApi } from '../services/api';
import Barcode from 'react-barcode';

interface Space {
  id: string;
  numero: number;
  piso?: number;
  seccion: string;
  tipo_permitido: string;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'RESERVADO' | 'MANTENIMIENTO';
  empleado_asignado_id?: number;
  es_para_empleado?: boolean;
  empleadoAsignado?: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    cedula?: string;
  };
}

interface VehicleInSpace {
  id: number;
  placa: string;
  tipo_vehiculo: string;
  espacio_id: string;
  horario_ingreso: string;
  codigo_barras: string;
}

export default function Spaces() {
  const [floor, setFloor] = useState(1);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [vehicles, setVehicles] = useState<Map<string, VehicleInSpace>>(new Map());
  const [loading, setLoading] = useState(true);

  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInSpace | null>(null);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const response = await spacesApi.getAll();
      console.log('Spaces response:', response.data);
      setSpaces(response.data || []);
    } catch (err) {
      console.error('Error fetching spaces', err);
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTickets = async () => {
    try {
      const response = await ticketsApi.getActive();
      console.log('Active tickets response:', response.data);
      const vehicleMap = new Map<string, VehicleInSpace>();
      response.data.forEach((ticket: any) => {
        const espacioId = ticket.espacio?.id || ticket.espacio_id;
        if (espacioId) {
          vehicleMap.set(espacioId, {
            id: ticket.id,
            placa: ticket.placa,
            tipo_vehiculo: ticket.tipo_vehiculo,
            espacio_id: espacioId,
            horario_ingreso: ticket.horario_ingreso,
            codigo_barras: ticket.codigo_barras,
          });
        }
      });
      console.log('Vehicle map:', vehicleMap);
      setVehicles(vehicleMap);
    } catch (err) {
      console.error('Error fetching tickets', err);
    }
  };

  useEffect(() => {
    fetchSpaces();
    fetchActiveTickets();
  }, [floor]);

  useEffect(() => {
    fetchActiveTickets();
    const interval = setInterval(() => {
      fetchActiveTickets();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const floorSpaces = [...spaces].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const getSpaceOccupied = (spaceId: string, esParaEmpleado: boolean | undefined, empleadoAsignado: any) => {
    return vehicles.has(spaceId) || (esParaEmpleado === true && !!empleadoAsignado);
  };

  const stats = {
    disponibles: floorSpaces.filter(s => !getSpaceOccupied(s.id, s.es_para_empleado, s.empleadoAsignado) && s.estado === 'DISPONIBLE').length,
    ocupados: floorSpaces.filter(s => getSpaceOccupied(s.id, s.es_para_empleado, s.empleadoAsignado) || s.estado === 'OCUPADO').length,
    reservados: floorSpaces.filter(s => s.estado === 'RESERVADO').length,
  };

  const getColor = (space: Space, isOccupied: boolean) => {
    if (space.es_para_empleado && space.empleadoAsignado) {
      return { bg: 'rgba(139,92,246,0.3)', border: '#8b5cf6', text: '#8b5cf6', label: 'EMPLEADO' };
    }
    if (isOccupied) {
      return { bg: 'rgba(239,68,68,0.3)', border: '#ef4444', text: '#ef4444', label: 'OCUPADO' };
    }
    switch (space.estado) {
      case 'DISPONIBLE': return { bg: 'rgba(34,197,94,0.2)', border: '#22c55e', text: '#22c55e', label: 'DISPONIBLE' };
      case 'OCUPADO': return { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', text: '#ef4444', label: 'OCUPADO' };
      case 'RESERVADO': return { bg: 'rgba(234,179,8,0.2)', border: '#eab308', text: '#eab308', label: 'RESERVADO' };
      case 'MANTENIMIENTO': return { bg: 'rgba(100,116,139,0.2)', border: '#64748b', text: '#64748b', label: 'MANTENIMIENTO' };
      default: return { bg: 'rgba(100,116,139,0.2)', border: '#64748b', text: '#64748b', label: '' };
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

  const handleSpaceClick = (space: Space) => {
    const vehicle = vehicles.get(space.id);
    setSelectedSpace(space);
    setSelectedVehicle(vehicle || null);
    setOpenInfoDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenInfoDialog(false);
    setSelectedSpace(null);
    setSelectedVehicle(null);
  };

  const calculateTime = (ingreso: string) => {
    const start = new Date(ingreso);
    const end = new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontFamily: 'Outfit', fontWeight: 700 }}>Mapa de Espacios</Typography>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <ToggleButtonGroup value={floor} exclusive onChange={(_, v) => v && setFloor(v)}>
            {[1, 2, 3, 4].map(p => <ToggleButton key={p} value={p}>Piso {p}</ToggleButton>)}
          </ToggleButtonGroup>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip label={`${stats.disponibles} Disponibles`} color="success" />
            <Chip label={`${stats.ocupados} Ocupados`} color="error" />
            <Chip label={`${stats.reservados} Reservados`} color="warning" />
          </Box>
        </Box>
      </Card>

      <Card>
        <Box sx={{ p: 3 }}>
          {loading ? (
            <Typography>Cargando espacios...</Typography>
          ) : (
            <Grid container spacing={1}>
              {floorSpaces.map((space) => {
                const isOccupied = getSpaceOccupied(space.id, space.es_para_empleado, space.empleadoAsignado);
                const vehicle = vehicles.get(space.id);
                const colors = getColor(space, isOccupied);
                const isEmployeeSpace = space.es_para_empleado && space.empleadoAsignado;
                return (
                  <Grid item xs={2} sm={1.5} md={1.2} key={space.id}>
                    <Tooltip
                      title={
                        vehicle ? (
                          <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{vehicle.placa}</Typography>
                            <Typography variant="caption" display="block">{vehicle.tipo_vehiculo}</Typography>
                            <Typography variant="caption" display="block">Ingreso: {new Date(vehicle.horario_ingreso).toLocaleTimeString('es-CO')}</Typography>
                            <Typography variant="caption" display="block">Tiempo: {calculateTime(vehicle.horario_ingreso)}</Typography>
                          </Box>
                        ) : space.empleadoAsignado ? (
                          <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Person fontSize="small" /> {space.empleadoAsignado.nombre}
                            </Typography>
                            <Typography variant="caption" display="block">{space.empleadoAsignado.rol}</Typography>
                            <Typography variant="caption" display="block">Espacio para empleado</Typography>
                          </Box>
                        ) : (
                          <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2">Espacio {space.id}</Typography>
                            <Typography variant="caption">Disponible</Typography>
                          </Box>
                        )
                      }
                      arrow
                      placement="top"
                      TransitionComponent={Fade}
                    >
                      <Box
                        onClick={() => handleSpaceClick(space)}
                        sx={{
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 1,
                          border: `2px solid ${colors.border}`,
                          bgcolor: colors.bg,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'scale(1.05)', boxShadow: 3 },
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: colors.text }}>{space.id}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: colors.text, opacity: 0.7 }}>{space.tipo_permitido.substring(0, 3)}</Typography>
                        {vehicle && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            {getVehicleIcon(vehicle.tipo_vehiculo)}
                          </Box>
                        )}
                        {!vehicle && space.es_para_empleado && space.empleadoAsignado && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Person sx={{ fontSize: 14, color: colors.text }} />
                          </Box>
                        )}
                        {isEmployeeSpace && (
                          <Typography variant="caption" sx={{ fontSize: '0.5rem', color: colors.text, fontWeight: 600 }}>
                            {space.empleadoAsignado?.cedula?.substring(0, 6) || 'EMP'}
                          </Typography>
                        )}
                        {vehicle && (
                          <Typography variant="caption" sx={{ fontSize: '0.55rem', color: colors.text, fontWeight: 600 }}>
                            {vehicle.placa}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Card>

      <Dialog open={openInfoDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Información del Espacio
            </Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Espacio</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>{selectedSpace?.id}</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Piso</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af' }}>{selectedSpace?.numero}</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Seccion</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af' }}>{selectedSpace?.seccion}</Typography>
              </Box>
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Tipo Permitido</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e40af' }}>{selectedSpace?.tipo_permitido}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" color="text.secondary">Estado:</Typography>
              <Chip
                label={selectedVehicle ? 'OCUPADO' : selectedSpace?.estado}
                color={
                  selectedVehicle ? 'error' :
                    selectedSpace?.estado === 'DISPONIBLE' ? 'success' :
                      selectedSpace?.estado === 'RESERVADO' ? 'warning' : 'default'
                }
              />
            </Box>

            {selectedVehicle && (
              <Box sx={{ mt: 2, p: 3, bgcolor: '#fff3e0', borderRadius: 2, border: '2px solid #ff9800' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DirectionsCar sx={{ color: '#ff9800' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#e65100' }}>Vehiculo Ocupante</Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Placa</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af' }}>{selectedVehicle.placa}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Tipo</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e40af' }}>{selectedVehicle.tipo_vehiculo}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime fontSize="small" color="info" />
                      <Typography variant="caption" color="text.secondary">Hora de Ingreso</Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e40af' }}>
                      {new Date(selectedVehicle.horario_ingreso).toLocaleString('es-CO')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime fontSize="small" color="info" />
                      <Typography variant="caption" color="text.secondary">Tiempo Transcurrido</Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#e65100' }}>
                      {calculateTime(selectedVehicle.horario_ingreso)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <ConfirmationNumber fontSize="small" color="info" />
                      <Typography variant="caption" color="text.secondary">Codigo de Barras</Typography>
                    </Box>
                    <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, display: 'inline-block' }}>
                      <Barcode value={selectedVehicle.codigo_barras} width={1.5} height={50} fontSize={14} />
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {!selectedVehicle && !selectedSpace?.estado && (
              <Box sx={{ mt: 2, p: 3, bgcolor: '#e8f5e9', borderRadius: 2, border: '2px solid #4caf50', textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                  Este espacio esta disponible
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Para registrar un vehiculo, use la funcion "Registrar vehiculo" en la seccion de Tickets
                </Typography>
              </Box>
            )}

            {selectedSpace?.estado === 'MANTENIMIENTO' && (
              <Box sx={{ mt: 2, p: 3, bgcolor: '#eceff1', borderRadius: 2, border: '2px solid #607d8b', textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#455a64', fontWeight: 500 }}>
                  Este espacio Estado en mantenimiento
                </Typography>
              </Box>
            )}

            {selectedSpace?.estado === 'RESERVADO' && (
              <Box sx={{ mt: 2, p: 3, bgcolor: '#fff8e1', borderRadius: 2, border: '2px solid #ffc107', textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#f57c00', fontWeight: 500 }}>
                  Este espacio esta reservado
                </Typography>
              </Box>
            )}

            {selectedSpace?.es_para_empleado && selectedSpace?.empleadoAsignado && (
              <Box sx={{ mt: 2, p: 3, bgcolor: '#f3e5f5', borderRadius: 2, border: '2px solid #8b5cf6' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Person sx={{ color: '#8b5cf6' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#7c3aed' }}>Espacio para Empleado</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Nombre</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                      {selectedSpace.empleadoAsignado.nombre}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Rol</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                      {selectedSpace.empleadoAsignado.rol}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body2" sx={{ color: '#7c3aed' }}>
                      {selectedSpace.empleadoAsignado.email}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
