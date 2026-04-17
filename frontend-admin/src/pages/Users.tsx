import { useState, useEffect } from 'react';
import { Box, Card, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert } from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { usersApi } from '../services/api';

interface User {
  id: number;
  nombre: string;
  username: string;
  email: string;
  rol: string;
  turno?: string;
  activo: boolean;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    email: '',
    password: '',
    rol: 'Operador',
    turno: 'Matutino',
  });

  const roles = ['Administrador', 'Supervisor', 'Operador', 'Tecnico'];
  const turns = ['Matutino', 'Vespertino', 'Nocturno', 'Rotativo'];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getSystemUsers();
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      setError('Error al cargar usuarios: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre,
        username: user.username,
        email: user.email,
        password: '',
        rol: user.rol,
        turno: user.turno || 'Matutino',
      });
    } else {
      setEditingUser(null);
      setFormData({ nombre: '', username: '', email: '', password: '', rol: 'Operador', turno: 'Matutino' });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        const updateData: any = {
          nombre: formData.nombre,
          username: formData.username,
          email: formData.email,
          rol: formData.rol,
          turno: formData.turno,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await usersApi.update(editingUser.id, updateData);
      } else {
        if (!formData.password) {
          setError('La contraseña es requerida para crear un nuevo usuario');
          return;
        }
        await usersApi.create(formData);
      }
      await loadUsers();
      setOpenDialog(false);
      setError('');
    } catch (err: any) {
      setError('Error al guardar usuario: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await usersApi.delete(id);
        await loadUsers();
      } catch (err: any) {
        setError('Error al eliminar usuario: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const getRoleColor = (rol: string) => {
    switch (rol) {
      case 'Administrador': return 'primary';
      case 'Supervisor': return 'secondary';
      case 'Operador': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>Gestion de Usuarios</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Nuevo Usuario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>Cargando usuarios...</Box>
        ) : users.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>No hay usuarios registrados</Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Turno</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.nombre}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Chip label={user.rol} color={getRoleColor(user.rol) as any} size="small" /></TableCell>
                    <TableCell>{user.turno}</TableCell>
                    <TableCell><Chip label={user.activo ? 'Activo' : 'Inactivo'} color={user.activo ? 'success' : 'error'} size="small" /></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog(user)}><Edit /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label="Nombre" fullWidth value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            <TextField label="Usuario" fullWidth value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
            <TextField label="Email" type="email" fullWidth value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <TextField
              label={editingUser ? "Nueva Contraseña (opcional)" : "Contraseña"}
              type="password"
              fullWidth
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              helperText={editingUser ? "Dejar en blanco para mantener la contraseña actual" : ""}
            />
            <TextField select label="Rol" fullWidth value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })}>
              {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField select label="Turno" fullWidth value={formData.turno} onChange={(e) => setFormData({ ...formData, turno: e.target.value })}>
              {turns.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
