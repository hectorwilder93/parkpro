# ParkPro - Guí­a de Deployment

Esta guía te ayudara¡ a desplegar ParkPro en producción.

## Requisitos del Servidor

| Recurso | Mi­nimo | Recomendado |
|--------|--------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| SSD | 20 GB | 50 GB |
| OS | Ubuntu 20.04+ | Ubuntu 22.04+ |

## Opciones de Deployment

### Opcion 1: Render (Gratuito con limitaciones)

**Ventajas:**
- Nivel gratuito disponible
- Configuracion simple
- PostgreSQL incluido

**Limitaciones:**
- CPU compartido
- Base de datos se reinicia cada 90 di­as
- Sin WebSocket (limitado)

**Pasos:**
1. Create una cuenta en [render.com](https://render.com)
2. Conecta tu repositorio GitHub
3. Crea los servicios:

```yaml
# Backend (Web Service)
name: parkpro-backend
runtime: Node
buildCommand: npm run build
startCommand: npm run start:prod
envVars:
  - key: NODE_ENV
    value: production
  - key: DB_HOST
    fromDB: true
  - key: DB_PORT
    value: 5432
  - key: DB_NAME
    fromDB: true
  - key: DB_USER
    fromDB: true
  - key: DB_PASSWORD
    fromDB: true
```

### Opcion 2: Railway (Pay-as-you-go)

**Ventajas:**
- Pricing simple (pagas lo que usas)
- PostgreSQL y Redis integrados
- Despliegue con un click

**Pasos:**
1. Create una cuenta en [railway.app](https://railway.app)
2. Instala Railway CLI:
```bash
npm i -g @railway/cli
railway login
```
3. Despliega desde el directorio raÃ­z:
```bash
railway init
railway up
```

### Opcion 3: Fly.io (Contenedores Docker)

**Ventajas:**
- Nivel gratuito generoso
- Despliegue global
- Docker nativo

**Pasos:**
1. Crete una cuenta en [fly.io](https://fly.io)
2. Instala CLI y autenti­cate:
```bash
fly auth signup
```
3. Configura y despliega:
```bash
fly launch --name parkpro
fly deploy
```

### Opcion 4: VPS Propio (DigitalOcean, Linode, AWS)

Esta opcion te da control total.

#### Pasos para DigitalOcean:

```bash
# 1. Create droplet en DigitalOcean
# 2. Conectate por SSH
ssh root@tu-ip

# 3. Instala Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 4. Instala Docker Compose
mkdir -p /opt/parkpro
cd /opt/parkpro
wget https://github.com/tu-usuario/parkpro/raw/main/docker-compose.yml

# 5. Configura variables
cp .env.example .env
nano .env  # Edita las variÃ¡veis

# 6. Inicia servicios
docker-compose up -d
```

## Configuracion para Produccion

### 1. Base de Datos PostgreSQL

Si usas el docker-compose.yml incluido:

```bash
# La base de datos se crea automaticamente
# Credenciales en .env
DB_PASSWORD=tu-contrasena-segura
```

### 2. Variables de Entorno Criticas

```bash
# .env - PRODUCCION
NODE_ENV=production
DB_PASSWORD=contrasena-muy-segura-aqui!
JWT_SECRET=MINIMO-32-CARACTERES-ALEATORIOS-AQUI!
JWT_EXPIRATION=8h
PORT=3000
```

### 3. SSL/HTTPS

Con Nginx:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    
    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

## Verificacion Post-Despliegue

### Health Checks

```bash
# API
curl https://tu-dominio.com/api/health

# Frontend
curl https://tu-dominio.com/

# Logs
docker-compose logs -f backend
docker-compose logs -f frontend-admin
```

## Puertos a abrir

| Puerto | Servicio |
|--------|---------|
| 80/443 | HTTP/HTTPS |
| 3000 | Backend API |
| 5432 | PostgreSQL (no exponer) |
| 6379 | Redis (no exponer) |

## Backup de Base de Datos

```bash
# Backup
docker exec parkpro-postgres pg_dump -U postgres parkpro_db > backup_$(date +%Y%m%d).sql

# Restaurar
docker exec -i parkpro-postgres psql -U postgres parkpro_db < backup_20240101.sql
```

## Monitoreo

### Logs
```bash
docker-compose logs --tail=100 -f
```

### Recursos
```bash
docker stats
```

## Problemas Comunes

### Error: Puerto en uso
```bash
sudo lsof -i :3000
kill -9 <PID>
```

### Error: Base de datos no conecta
```bash
# Verificar conexiÃ³n
docker exec parkpro-backend nc -zv postgres 5432

# Ver logs
docker-compose logs postgres
```

### Error: CORS
Ya esta¡ configurado para permitir todos los ori­genes. En produccion, configura:
```typescript
// backend/src/main.ts
app.enableCors({
  origin: 'https://tu-dominio.com',
  credentials: true,
});
```

## Seguridad en Produccion

1. **Cambia JWT_SECRET** con valor aleatorio de 32+ caracteres
2. **Usa HTTPS** siempre
3. **No expongas** puertos de DB/Redis
4. **Actualiza** dependencias regularmente
5. **Haz backups** de la base de datos

---

## Recomendacion Final

Para un usuario que estÃ¡ empezando, recomendo:

| Posicion | Plataforma | Costo |
|---------|------------|-------|
| 1ra | Render | Gratis |
| 2da | Railway | $5/mes |
| 3ra | VPS (DigitalOcean) | $6/mes |

Render es ideal para pruebas y proyectos pequeños. Railway para producción con tráfico moderado. VPS propio para control total.