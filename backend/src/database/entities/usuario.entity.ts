import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Ticket } from './ticket.entity';
import { CierreTurno } from './cierre-turno.entity';
import { EspacioEmpleado } from './espacio-empleado.entity';

export enum RolUsuario {
  ADMINISTRADOR = 'Administrador',
  SUPERVISOR = 'Supervisor',
  OPERADOR = 'Operador',
  TECNICO = 'Tecnico',
}

export enum TurnoOperador {
  MATUTINO = 'Matutino',
  VESPERTINO = 'Vespertino',
  NOCTURNO = 'Nocturno',
  ROTATIVO = 'Rotativo',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 20, nullable: true, unique: true })
  cedula: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.OPERADOR })
  rol: RolUsuario;

  @Column({ type: 'enum', enum: TurnoOperador, nullable: true })
  turno: TurnoOperador;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  ultimo_acceso: Date;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.usuarioEntrada)
  ticketsEntrada: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.usuarioSalida)
  ticketsSalida: Ticket[];

  @OneToMany(() => CierreTurno, (cierre) => cierre.operador)
  cierres: CierreTurno[];

  @OneToMany(() => EspacioEmpleado, (asignacion) => asignacion.empleado)
  asignacionesEspacios: EspacioEmpleado[];
}
