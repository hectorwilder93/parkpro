import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global prefix
  app.setGlobalPrefix('api');

  // Enable CORS - Allow all origins in development
  app.enableCors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ParkPro API')
    .setDescription('Sistema de Gestion de Parqueadero - Documentacion de API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Autenticacion')
    .addTag('users', 'Gestion de Usuarios')
    .addTag('vehicles', 'Gestion de Vehiculos')
    .addTag('tickets', 'Gestion de Tickets')
    .addTag('payments', 'Gestion de Pagos')
    .addTag('invoices', 'Facturacion Electronica')
    .addTag('spaces', 'Gestion de Espacios')
    .addTag('reports', 'Reportes y Cierres')
    .addTag('alarms', 'Alarmas y Notificaciones')
    .addTag('audit', 'Logs de Auditori�a')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(process.env.SWAGGER_PATH || 'api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`

ParkPro API
Servidor corriendo en: http://localhost:${port}
  Documentacion Swagger: http://localhost:${port}${process.env.SWAGGER_PATH || '/api/docs'} 
  `);
}

bootstrap();
