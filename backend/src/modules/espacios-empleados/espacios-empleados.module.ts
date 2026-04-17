import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspaciosEmpleadosController } from './espacios-empleados.controller';
import { EspaciosEmpleadosService } from './espacios-empleados.service';
import { EspacioEmpleado, Espacio, Usuario } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([EspacioEmpleado, Espacio, Usuario])],
  controllers: [EspaciosEmpleadosController],
  providers: [EspaciosEmpleadosService],
  exports: [EspaciosEmpleadosService],
})
export class EspaciosEmpleadosModule {}
