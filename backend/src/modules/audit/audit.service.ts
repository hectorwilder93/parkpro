import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LogAuditoria } from '../../database/entities';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(LogAuditoria)
    private logRepository: Repository<LogAuditoria>,
  ) {}

  async findAll(limit = 100): Promise<LogAuditoria[]> {
    return this.logRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['usuario'],
    });
  }

  async findByUser(userId: number, limit = 50): Promise<LogAuditoria[]> {
    return this.logRepository.find({
      where: { usuario_id: userId },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['usuario'],
    });
  }

  async findByTable(tableName: string, limit = 50): Promise<LogAuditoria[]> {
    return this.logRepository.find({
      where: { tabla_afectada: tableName },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['usuario'],
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<LogAuditoria[]> {
    return this.logRepository.find({
      where: {
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'DESC' },
      relations: ['usuario'],
    });
  }

  async create(data: {
    usuario_id?: number;
    accion: string;
    detalle?: string;
    ip_address?: string;
    tabla_afectada?: string;
    registro_id?: number;
    datos_previos?: Record<string, any>;
    datos_nuevos?: Record<string, any>;
  }): Promise<LogAuditoria> {
    const log = this.logRepository.create(data);
    return this.logRepository.save(log);
  }

  async getRecentActivity(limit = 20): Promise<LogAuditoria[]> {
    return this.logRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['usuario'],
    });
  }
}
