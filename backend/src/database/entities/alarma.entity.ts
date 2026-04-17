import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('alarmas_seguridad')
export class Alarma {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  tipo: string;

  @Column({ length: 20 })
  severidad: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'jsonb', nullable: true })
  detalles: Record<string, any>;

  @CreateDateColumn()
  fecha_evento: Date;

  @Column({ nullable: true })
  fecha_resolucion: Date;

  @Column({ nullable: true })
  usuario_id_resuelve: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id_resuelve' })
  usuarioResuelve: Usuario;

  @Column({ default: 'ACTIVA' })
  estado: string;
}
