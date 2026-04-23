import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Factura, Ticket, Pago } from '../../database/entities';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, Ticket, Pago]),
    ConfiguracionModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule { }
