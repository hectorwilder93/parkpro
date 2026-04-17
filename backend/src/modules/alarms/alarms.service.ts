import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alarma } from '../../database/entities';

@Injectable()
export class AlarmsService {
  constructor(
    @InjectRepository(Alarma)
    private alarmaRepository: Repository<Alarma>,
  ) {}

  async findAll(): Promise<Alarma[]> {
    return this.alarmaRepository.find({
      order: { fecha_evento: 'DESC' },
    });
  }

  async findActive(): Promise<Alarma[]> {
    return this.alarmaRepository.find({
      where: { estado: 'ACTIVA' },
      order: { fecha_evento: 'DESC' },
    });
  }

  async findById(id: number): Promise<Alarma> {
    const alarma = await this.alarmaRepository.findOne({ where: { id } });
    if (!alarma) {
      throw new NotFoundException(`Alarma con ID ${id} no encontrada`);
    }
    return alarma;
  }

  async create(data: {
    tipo: string;
    severidad: string;
    mensaje: string;
    detalles?: Record<string, any>;
  }): Promise<Alarma> {
    const alarma = this.alarmaRepository.create({
      tipo: data.tipo,
      severidad: data.severidad,
      mensaje: data.mensaje,
      detalles: data.detalles,
    });
    return this.alarmaRepository.save(alarma);
  }

  async resolve(id: number, usuarioId: number): Promise<Alarma> {
    const alarma = await this.findById(id);
    alarma.estado = 'RESUELTA';
    alarma.fecha_resolucion = new Date();
    alarma.usuario_id_resuelve = usuarioId;
    return this.alarmaRepository.save(alarma);
  }

  async getStats(): Promise<{ total: number; activas: number; resueltas: number }> {
    const total = await this.alarmaRepository.count();
    const activas = await this.alarmaRepository.count({ where: { estado: 'ACTIVA' } });
    const resueltas = await this.alarmaRepository.count({ where: { estado: 'RESUELTA' } });
    return { total, activas, resueltas };
  }
}
