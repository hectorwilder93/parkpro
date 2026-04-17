import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('logs_auditoria')
export class LogAuditoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  usuario_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ length: 100 })
  accion: string;

  @Column({ type: 'text', nullable: true })
  detalle: string;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ length: 50, nullable: true })
  tabla_afectada: string;

  @Column({ nullable: true })
  registro_id: number;

  @Column({ type: 'jsonb', nullable: true })
  datos_previos: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  datos_nuevos: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}
