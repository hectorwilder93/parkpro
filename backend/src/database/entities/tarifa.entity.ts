import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum TipoVehiculo {
  AUTOMOVIL = 'Automóvil',
  MOTOCICLETA = 'Motocicleta',
  CAMIONETA = 'Camioneta',
  DISCAPACITADOS = 'Discapacitados',
}

@Entity('tarifas')
export class Tarifa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  tipo_vehiculo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor_hora: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_minuto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_maximo_dia: number;

  @Column({ type: 'date' })
  vigencia_desde: Date;

  @Column({ type: 'date', nullable: true })
  vigencia_hasta: Date;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;
}
