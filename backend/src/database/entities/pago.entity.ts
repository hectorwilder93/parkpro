import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, CreateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Ticket } from './ticket.entity';
import { Usuario } from './usuario.entity';

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  DATAFONO = 'DATAFONO',
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',
  BANCOLOMBIA = 'BANCOLOMBIA',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  COMPLETADO = 'COMPLETADO',
  FALLIDO = 'FALLIDO',
  REEMBOLSADO = 'REEMBOLSADO',
}

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticket_id: number;

  @OneToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'enum', enum: MetodoPago, enumName: 'metodo_pago' })
  metodo: MetodoPago;

  @Column({ type: 'enum', enum: EstadoPago, enumName: 'estado_pago', default: EstadoPago.COMPLETADO })
  estado: EstadoPago;

  @Column({ nullable: true })
  transaccion_id: string;

  @CreateDateColumn()
  fecha_pago: Date;

  @Column()
  usuario_id_procesa: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id_procesa' })
  usuarioProcesa: Usuario;
}

@Entity('pagos_efectivo')
export class PagoEfectivo {
  @PrimaryColumn()
  id: number;

  @OneToOne(() => Pago)
  @JoinColumn({ name: 'id' })
  pago: Pago;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto_recibido: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  vuelto: number;
}

@Entity('pagos_digital')
export class PagoDigital {
  @PrimaryColumn()
  id: number;

  @OneToOne(() => Pago)
  @JoinColumn({ name: 'id' })
  pago: Pago;

  @Column()
  plataforma: string;

  @Column({ type: 'text', nullable: true })
  qr_code: string;

  @Column({ nullable: true })
  url_pago: string;

  @Column({ length: 15, nullable: true })
  telefono_asociado: string;
}

@Entity('pagos_datafono')
export class PagoDatafono {
  @PrimaryColumn()
  id: number;

  @OneToOne(() => Pago)
  @JoinColumn({ name: 'id' })
  pago: Pago;

  @Column({ length: 20 })
  terminal_id: string;

  @Column({ length: 255, nullable: true })
  tarjeta_hash: string;

  @Column({ length: 20, nullable: true })
  autorizacion_codigo: string;
}
