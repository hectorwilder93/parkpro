import { Entity, PrimaryColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TipoVehiculo } from './tarifa.entity';
import { Usuario } from './usuario.entity';
import { EspacioEmpleado } from './espacio-empleado.entity';

export enum EstadoEspacio {
  DISPONIBLE = 'DISPONIBLE',
  OCUPADO = 'OCUPADO',
  RESERVADO = 'RESERVADO',
  MANTENIMIENTO = 'MANTENIMIENTO',
}

@Entity('espacios')
export class Espacio {
  @PrimaryColumn({ length: 10 })
  id: string;

  @Column()
  numero: number;

  @Column({ length: 10 })
  seccion: string;

  @Column({ length: 20 })
  tipo_permitido: string;

  @Column({ type: 'enum', enum: EstadoEspacio, default: EstadoEspacio.DISPONIBLE })
  estado: EstadoEspacio;

  @Column({ nullable: true })
  coordenada_x: number;

  @Column({ nullable: true })
  coordenada_y: number;

  @Column({ nullable: true })
  empleado_asignado_id: number;

  @Column({ default: false })
  es_para_empleado: boolean;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'empleado_asignado_id' })
  empleadoAsignado: Usuario;

  @OneToMany(() => EspacioEmpleado, (asignacion) => asignacion.espacio)
  asignacionesEmpleados: EspacioEmpleado[];
}
