import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('configuracion')
export class Configuracion {
  @PrimaryColumn({ default: 'sistema' })
  clave: string;

  @Column({ type: 'jsonb', nullable: true })
  valor: any;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
