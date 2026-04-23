import { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Credenciales invalidas');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: string) => {
    const credentials = {
      admin: { username: 'admin', password: 'Admin123!' },
      supervisor: { username: 'supervisor', password: 'ParkPro2024!' },
      operador: { username: 'operador1', password: 'ParkPro2024!' },
    };
    setUsername(credentials[role as keyof typeof credentials]?.username || '');
    setPassword(credentials[role as keyof typeof credentials]?.password || '');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%', bgcolor: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(20px)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img src="/src/assets/img/logo.png" alt="ParkPro" style={{ height: 90, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }} />
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, background: 'linear-gradient(135deg, #f8fafc, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1 }}>
              ParkPro
            </Typography>
            <Typography color="text.secondary">Sistema de Gestion de Parqueadero</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="ContraseÒa"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button fullWidth variant="contained" size="large" type="submit" disabled={loading} sx={{ mb: 3 }}>
              {loading ? 'Iniciando...' : 'Iniciar Sesi√≥n'}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Usuarios de demostracion
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {['admin', 'supervisor', 'operador'].map((role) => (
              <Button key={role} variant="outlined" size="small" onClick={() => handleDemoLogin(role)}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
