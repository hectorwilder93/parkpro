import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { TipoVehiculo } from './tarifa.entity';

@Entity('vehiculos')
export class Vehiculo {
  @PrimaryColumn({ length: 10 })
  placa: string;

  @Column({ type: 'enum', enum: TipoVehiculo })
  tipo: TipoVehiculo;

  @Column({ length: 50, nullable: true })
  marca: string;

  @Column({ length: 30, nullable: true })
  color: string;

  @Column({ default: false })
  es_empleado: boolean;

  @CreateDateColumn()
  fecha_registro: Date;
}
