import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Espacio } from './espacio.entity';

@Entity('espacios_empleados')
export class EspacioEmpleado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10 })
  espacio_id: string;

  @Column({ nullable: true })
  empleado_id: number;

  @Column({ length: 20, nullable: true })
  cedula: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100.00 })
  porcentaje_descuento: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_inicio: Date;

  @Column({ type: 'date', nullable: true })
  fecha_fin: Date;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => Espacio, (espacio) => espacio.asignacionesEmpleados)
  @JoinColumn({ name: 'espacio_id' })
  espacio: Espacio;

  @ManyToOne(() => Usuario, (usuario) => usuario.asignacionesEspacios)
  @JoinColumn({ name: 'empleado_id' })
  empleado: Usuario;
}
