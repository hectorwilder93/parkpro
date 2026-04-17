import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AlarmsModule } from './modules/alarms/alarms.module';
import { AuditModule } from './modules/audit/audit.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';
import { EspaciosEmpleadosModule } from './modules/espacios-empleados/espacios-empleados.module';

@Module({
  imports: [
    // Config Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // TypeORM Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST') || 'localhost',
        port: parseInt(configService.get('DB_PORT')) || 5432,
        username: configService.get('DB_USER') || 'parkpro_user',
        password: configService.get('DB_PASSWORD') || 'ParkPro2024Secure!',
        database: configService.get('DB_NAME') || 'parkpro_db',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: false,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    
    // Cache Module - Memory cache in development, Redis in production
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST');
        if (redisHost && redisHost.trim() !== '' && redisHost !== 'localhost' && redisHost !== '127.0.0.1') {
          return {
            store: require('cache-manager-redis-store'),
            host: redisHost,
            port: parseInt(configService.get('REDIS_PORT')) || 6379,
            ttl: 3600,
            max: 100,
          } as any;
        }
        return {
          ttl: 3600,
          max: 100,
        };
      },
    }),
    
    // Application Modules
    AuthModule,
    UsersModule,
    VehiclesModule,
    TicketsModule,
    PaymentsModule,
    InvoicesModule,
    SpacesModule,
    ReportsModule,
    AlarmsModule,
    AuditModule,
    ConfiguracionModule,
    EspaciosEmpleadosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
