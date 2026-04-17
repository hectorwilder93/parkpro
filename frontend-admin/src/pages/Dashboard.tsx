import { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Skeleton } from '@mui/material';
import { CarRental, MeetingRoom, AttachMoney, ConfirmationNumber } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ticketsApi, spacesApi, paymentsApi } from '../services/api';

const mockData = {
  tickets: { active: 12, finished: 156, total: 168 },
  spaces: { total: 200, disponibles: 45, ocupados: 155 },
  income: { today: 1250000, week: 8500000, month: 35000000 },
};

const weeklyData = [
  { day: 'Lun', income: 1200000, tickets: 45 },
  { day: 'Mar', income: 1800000, tickets: 62 },
  { day: 'Mier', income: 900000, tickets: 38 },
  { day: 'Jue', income: 1500000, tickets: 55 },
  { day: 'Vie', income: 2000000, tickets: 78 },
  { day: 'Sab', income: 1650000, tickets: 60 },
  { day: 'Dom', income: 1350000, tickets: 48 },
];

const monthlyData = [
  { month: 'Ene', income: 28000000 },
  { month: 'Feb', income: 32000000 },
  { month: 'Mar', income: 29000000 },
  { month: 'Abr', income: 35000000 },
];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}20` }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(mockData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, spacesRes, incomeRes] = await Promise.all([
          ticketsApi.getStats().catch(() => ({ data: mockData.tickets })),
          spacesApi.getStats().catch(() => ({ data: mockData.spaces })),
          paymentsApi.getDaily().catch(() => ({ data: mockData.income.today })),
        ]);

        setStats({
          tickets: ticketsRes.data,
          spaces: spacesRes.data,
          income: { today: incomeRes.data || mockData.income.today },
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontFamily: 'Outfit', fontWeight: 700 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vehiculos Activos"
            value={stats.tickets?.active || 0}
            icon={<CarRental sx={{ color: '#3b82f6' }} />}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Espacios Disponibles"
            value={`${stats.spaces?.disponibles || 0} / ${stats.spaces?.total || 0}`}
            icon={<MeetingRoom sx={{ color: '#22c55e' }} />}
            color="#22c55e"
            subtitle={`${stats.spaces?.ocupados || 0} ocupados`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ingresos Hoy"
            value={formatCurrency(stats.income?.today || 0)}
            icon={<AttachMoney sx={{ color: '#eab308' }} />}
            color="#eab308"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Tickets"
            value={stats.tickets?.total || 0}
            icon={<ConfirmationNumber sx={{ color: '#ef4444' }} />}
            color="#ef4444"
            subtitle={`${stats.tickets?.finished || 0} finalizados`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Ingresos Semanales</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Ingresos Mensuales</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
