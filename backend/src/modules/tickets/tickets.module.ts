import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from '../../database/entities';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SpacesModule } from '../spaces/spaces.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket]),
    VehiclesModule,
    forwardRef(() => SpacesModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
