import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Reporte, CierreTurno, Ticket, Pago } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Reporte, CierreTurno, Ticket, Pago])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
