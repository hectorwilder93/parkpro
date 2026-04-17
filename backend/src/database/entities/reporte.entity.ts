import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

export enum TipoReporte {
  CIERRE_TURNO = 'CIERRE_TURNO',
  DIARIO = 'DIARIO',
  SEMANAL = 'SEMANAL',
  MENSUAL = 'MENSUAL',
  ANUAL = 'ANUAL',
}

@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoReporte })
  tipo: TipoReporte;

  @CreateDateColumn()
  fecha_generacion: Date;

  @Column()
  usuario_id_genera: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id_genera' })
  usuarioGenera: Usuario;

  @Column({ length: 200 })
  titulo: string;

  @Column({ type: 'jsonb' })
  contenido_json: Record<string, any>;

  @Column({ nullable: true })
  archivo_url: string;

  @Column({ type: 'date', nullable: true })
  fecha_desde: Date;

  @Column({ type: 'date', nullable: true })
  fecha_hasta: Date;
}
