# ParkPro - Sistema de Gestión de Parqueadero

Sistema completo de gestión de parqueadero con control de acceso automatizado, facturación electrónica colombiana, múltiples métodos de pago y reportes gerenciales.

## 🚀 Características

- **Autenticación**: JWT con Passport.js
- **Gestión de Entrada/Salida**: Tickets con código de barras
- **Pagos**: Efectivo, Datáfono, Nequi, Daviplata, Bancolombia
- **Facturación**: Facturación electrónica DIAN (UBL 2.1)
- **Reportes**: Cierres de turno, reportes diarios/semanales/mensuales
- **UI Responsiva**: Dashboard web adaptativo

## 🛠️ Tecnologías

### Backend
- Node.js 20 LTS
- NestJS 10
- PostgreSQL 15
- Redis 7
- TypeORM
- Swagger/OpenAPI

### Frontend
- React 18
- Vite 5
- Material UI 5
- Recharts
- Zustand

## 📋 Requisitos Previos

- Node.js 20+
- Docker y Docker Compose
- PostgreSQL 15+ (o usar Docker)
- Redis 7+ (o usar Docker)

## 🔧 Instalación

### Opción 1: Con Docker (Recomendado)

```bash
# Clonar el proyecto
cd parkpro

# Copiar variables de entorno
cp .env.example .env

# Iniciar servicios
docker-compose up -d
```

### Opción 2: Desarrollo Local

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend-admin
npm install
npm run dev
```

## 🔐 Credenciales por Defecto

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Administrador | admin | Admin123! |
| Supervisor | supervisor | Super123! |
| Operador | operador1 | Oper123! |

## 📱 Endpoints API

- `POST /api/auth/login` - Iniciar sesión
- `GET /api/users` - Listar usuarios
- `GET /api/tickets` - Listar tickets
- `POST /api/tickets/entry` - Registrar entrada
- `POST /api/tickets/exit` - Procesar salida
- `GET /api/spaces` - Listar espacios
- `GET /api/reports` - Obtener reportes
- `GET /api/docs` - Documentación Swagger

## 📁 Estructura del Proyecto

```
parkpro/
├── backend/
│   ├── src/
│   │   ├── modules/       # Módulos NestJS
│   │   ├── database/     # Entidades TypeORM
│   │   └── config/       # Configuración
│   └── Dockerfile
├── frontend-admin/
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── pages/        # Páginas
│   │   ├── services/     # Servicios API
│   │   └── store/        # Estado global
│   └── Dockerfile
├── database/
│   └── init.sql          # Script SQL inicial
├── nginx/
│   └── conf.d/           # Configuración Nginx
├── docker-compose.yml
└── .env.example
```

## 📄 Licencia

MIT
