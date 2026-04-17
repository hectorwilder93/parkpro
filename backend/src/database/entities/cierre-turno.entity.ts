import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('cierres_turno')
export class CierreTurno {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  operador_id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'operador_id' })
  operador: Usuario;

  @Column()
  fecha_inicio: Date;

  @Column()
  fecha_fin: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_efectivo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_datafono: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_nequi: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_daviplata: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_bancolombia: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  efectivo_declarado: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  diferencia: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ nullable: true })
  supervisor_valida: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'supervisor_valida' })
  supervisor: Usuario;

  @Column({ nullable: true })
  fecha_validacion: Date;
}
