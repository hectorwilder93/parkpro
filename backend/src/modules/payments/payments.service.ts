import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago, MetodoPago, EstadoPago } from '../../database/entities';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Pago)
    private pagoRepository: Repository<Pago>,
  ) {}

  async findAll(): Promise<Pago[]> {
    return this.pagoRepository.find({
      order: { fecha_pago: 'DESC' },
      relations: ['ticket', 'usuarioProcesa'],
    });
  }

  async findById(id: number): Promise<Pago> {
    const pago = await this.pagoRepository.findOne({
      where: { id },
      relations: ['ticket', 'usuarioProcesa'],
    });
    
    if (!pago) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }
    
    return pago;
  }

  async findByTicket(ticketId: number): Promise<Pago> {
    return this.pagoRepository.findOne({
      where: { ticket_id: ticketId },
      relations: ['ticket', 'usuarioProcesa'],
    });
  }

  async createPayment(data: {
    ticket_id: number;
    monto: number;
    metodo: MetodoPago;
    usuario_id_procesa: number;
    transaccion_id?: string;
  }): Promise<Pago> {
    const pago = this.pagoRepository.create({
      ticket_id: data.ticket_id,
      monto: data.monto,
      metodo: data.metodo,
      estado: EstadoPago.COMPLETADO,
      transaccion_id: data.transaccion_id || this.generateTransactionId(),
      usuario_id_procesa: data.usuario_id_procesa,
    });

    return this.pagoRepository.save(pago);
  }

  async getStatsByMethod(startDate?: Date, endDate?: Date): Promise<any[]> {
    const query = this.pagoRepository.createQueryBuilder('pago')
      .select('pago.metodo', 'metodo')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('SUM(pago.monto)', 'total')
      .where('pago.estado = :estado', { estado: EstadoPago.COMPLETADO });

    if (startDate && endDate) {
      query.andWhere('pago.fecha_pago BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    return query.groupBy('pago.metodo').getRawMany();
  }

  async getDailyIncome(date?: Date): Promise<number> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const result = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('SUM(pago.monto)', 'total')
      .where('pago.estado = :estado', { estado: EstadoPago.COMPLETADO })
      .andWhere('pago.fecha_pago BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .getRawOne();

    return result?.total || 0;
  }

  private generateTransactionId(): string {
    return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  }
}
