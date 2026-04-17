import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticket_id: number;

  @OneToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ length: 100, unique: true })
  cufe: string;

  @Column({ length: 20 })
  nit_cliente: string;

  @Column({ length: 100 })
  nombre_cliente: string;

  @Column({ length: 100, nullable: true })
  email_cliente: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  iva: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @CreateDateColumn()
  fecha_emision: Date;

  @Column({ type: 'text', nullable: true })
  xml_dian: string;

  @Column({ default: 'ENVIADA' })
  estado_dian: string;
}
