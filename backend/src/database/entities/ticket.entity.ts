import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Vehiculo } from './vehiculo.entity';
import { Espacio } from './espacio.entity';
import { Tarifa, TipoVehiculo } from './tarifa.entity';
import { Pago } from './pago.entity';
import { Factura } from './factura.entity';

export enum EstadoTicket {
  ACTIVO = 'ACTIVO',
  FINALIZADO = 'FINALIZADO',
  ANULADO = 'ANULADO',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  codigo_barras: string;

  @Column({ length: 10 })
  placa: string;

  @ManyToOne(() => Vehiculo)
  @JoinColumn({ name: 'placa' })
  vehiculo: Vehiculo;

  @Column({ length: 20 })
  tipo_vehiculo: string;

  @Column()
  horario_ingreso: Date;

  @Column({ nullable: true })
  horario_salida: Date;

  @Column({ length: 10, nullable: true })
  espacio_id: string;

  @ManyToOne(() => Espacio, { nullable: true })
  @JoinColumn({ name: 'espacio_id' })
  espacio: Espacio;

  @Column({ type: 'enum', enum: EstadoTicket, default: EstadoTicket.ACTIVO })
  estado: EstadoTicket;

  @Column()
  usuario_id_entrada: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id_entrada' })
  usuarioEntrada: Usuario;

  @Column({ nullable: true })
  usuario_id_salida: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id_salida' })
  usuarioSalida: Usuario;

  @Column({ nullable: true })
  tarifa_aplicada_id: number;

  @ManyToOne(() => Tarifa, { nullable: true })
  @JoinColumn({ name: 'tarifa_aplicada_id' })
  tarifaAplicada: Tarifa;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @OneToOne(() => Pago, (pago) => pago.ticket)
  pago: Pago;

  @OneToOne(() => Factura, (factura) => factura.ticket)
  factura: Factura;
}
