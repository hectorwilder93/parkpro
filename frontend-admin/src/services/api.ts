import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (data: { username: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
};

// Users API
export const usersApi = {
  getAll: () => api.get('/users'),
  getSystemUsers: () => api.get('/users/system'),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Tickets API
export const ticketsApi = {
  getAll: () => api.get('/tickets'),
  getActive: () => api.get('/tickets/active'),
  getStats: () => api.get('/tickets/stats'),
  getById: (id: number) => api.get(`/tickets/${id}`),
  search: (data: { codigo_barras?: string; placa?: string }) => api.post('/tickets/search', data),
  entry: (data: { placa: string; tipo_vehiculo: string; notas?: string }) => api.post('/tickets/entry', data),
  exit: (data: { codigo_barras: string; metodo_pago: string; monto: number }) => api.post('/tickets/exit', data),
  calculateRate: (id: number) => api.get(`/tickets/${id}/rate`),
  digitalPayment: (data: { 
    codigo_barras: string; 
    metodo_pago: string; 
    monto: number;
    telefono?: string;
    email?: string;
    referencia?: string;
  }) => api.post('/tickets/digital-payment', data),
};

// Spaces API
export const spacesApi = {
  getAll: () => api.get('/spaces'),
  getByFloor: (floor: number) => api.get(`/spaces/floor/${floor}`),
  getStats: () => api.get('/spaces/stats'),
  getById: (id: string) => api.get(`/spaces/${id}`),
  create: (data: { id: string; numero: number; seccion: string; tipo_permitido: string }) => api.post('/spaces', data),
  update: (id: string, data: { numero?: number; seccion?: string; tipo_permitido?: string; estado?: string; es_para_empleado?: boolean; empleado_asignado_id?: number | null }) => api.put(`/spaces/${id}`, data),
  delete: (id: string) => api.delete(`/spaces/${id}`),
};

// Payments API
export const paymentsApi = {
  getAll: () => api.get('/payments'),
  getStats: (startDate?: string, endDate?: string) => 
    api.get('/payments/stats', { params: { startDate, endDate } }),
  getDaily: (date?: string) => api.get('/payments/daily', { params: { date } }),
};

// Reports API
export const reportsApi = {
  getAll: () => api.get('/reports'),
  getClosures: () => api.get('/reports/closures'),
  getDaily: (date?: string) => api.get('/reports/daily', { params: { date } }),
  getDailyByTurn: (date: string) => api.get('/reports/daily-by-turn', { params: { date } }),
  getResumen: () => api.get('/reports/resumen'),
  create: (data: any) => api.post('/reports', data),
  createClosure: (data: any) => api.post('/reports/closure', data),
};

// Invoices API
export const invoicesApi = {
  getAll: () => api.get('/invoices'),
  getById: (id: number) => api.get(`/invoices/${id}`),
  getByTicket: (ticketId: number) => api.get(`/invoices/ticket/${ticketId}`),
  create: (data: any) => api.post('/invoices', data),
};

// Alarms API
export const alarmsApi = {
  getAll: () => api.get('/alarms'),
  getActive: () => api.get('/alarms/active'),
  getStats: () => api.get('/alarms/stats'),
  create: (data: any) => api.post('/alarms', data),
  resolve: (id: number) => api.post(`/alarms/${id}/resolve`),
};

// Configuracion API
export const configuracionApi = {
  get: () => api.get('/configuracion'),
  save: (data: any) => api.post('/configuracion', data),
};

// Audit API
export const auditApi = {
  getAll: (limit?: number) => api.get('/audit', { params: { limit } }),
  getRecent: (limit?: number) => api.get('/audit/recent', { params: { limit } }),
  getByUser: (userId: number, limit?: number) => api.get(`/audit/user/${userId}`, { params: { limit } }),
};

// Espacios Empleados API
export const espaciosEmpleadosApi = {
  getAll: () => api.get('/espacios-empleados'),
  getActivos: () => api.get('/espacios-empleados/activos'),
  getByEmpleado: (empleadoId: number) => api.get(`/espacios-empleados/empleado/${empleadoId}`),
  getByEspacio: (espacioId: string) => api.get(`/espacios-empleados/espacio/${espacioId}`),
  getParaEmpleados: () => api.get('/espacios-empleados/para-empleados'),
  getReporteNomina: (fechaInicio?: string, fechaFin?: string) => 
    api.get('/espacios-empleados/reporte-nomina', { params: { fechaInicio, fechaFin } }),
  getById: (id: number) => api.get(`/espacios-empleados/${id}`),
  create: (data: {
    espacio_id: string;
    cedula: string;
    nombre?: string;
    porcentaje_descuento?: number;
    activo?: boolean;
    fecha_inicio?: string;
    fecha_fin?: string;
  }) => api.post('/espacios-empleados', data),
  update: (id: number, data: {
    porcentaje_descuento?: number;
    activo?: boolean;
    fecha_inicio?: string;
    fecha_fin?: string;
  }) => api.put(`/espacios-empleados/${id}`, data),
  deactivate: (id: number) => api.put(`/espacios-empleados/${id}/desactivar`),
  delete: (id: number) => api.delete(`/espacios-empleados/${id}`),
};
