import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Reporte, CierreTurno, Ticket, Pago, MetodoPago, EstadoPago } from '../../database/entities';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Reporte)
    private reporteRepository: Repository<Reporte>,
    @InjectRepository(CierreTurno)
    private cierreRepository: Repository<CierreTurno>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Pago)
    private pagoRepository: Repository<Pago>,
  ) {}

  async findAllReports(): Promise<Reporte[]> {
    return this.reporteRepository.find({
      order: { fecha_generacion: 'DESC' },
      relations: ['usuarioGenera'],
    });
  }

  async findAllClosures(): Promise<CierreTurno[]> {
    return this.cierreRepository.find({
      order: { fecha_fin: 'DESC' },
      relations: ['operador', 'supervisor'],
    });
  }

  async createReport(data: {
    tipo: string;
    titulo: string;
    contenido_json: Record<string, any>;
    usuario_id_genera: number;
    fecha_desde?: Date;
    fecha_hasta?: Date;
  }): Promise<Reporte> {
    const reporte = this.reporteRepository.create({
      tipo: data.tipo as any,
      titulo: data.titulo,
      contenido_json: data.contenido_json,
      usuario_id_genera: data.usuario_id_genera,
      fecha_desde: data.fecha_desde,
      fecha_hasta: data.fecha_hasta,
    });

    return this.reporteRepository.save(reporte);
  }

  async createClosure(data: {
    operador_id: number;
    fecha_inicio: Date;
    fecha_fin: Date;
    observaciones?: string;
  }): Promise<CierreTurno> {
    // Calculate totals
    const pagos = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('pago.metodo', 'metodo')
      .addSelect('SUM(pago.monto)', 'total')
      .where('pago.fecha_pago BETWEEN :start AND :end', {
        start: data.fecha_inicio,
        end: data.fecha_fin,
      })
      .andWhere('pago.estado = :estado', { estado: EstadoPago.COMPLETADO })
      .groupBy('pago.metodo')
      .getRawMany();

    const totals: any = {
      total_efectivo: 0,
      total_datafono: 0,
      total_nequi: 0,
      total_daviplata: 0,
      total_bancolombia: 0,
    };

    pagos.forEach((p: any) => {
      switch (p.metodo) {
        case MetodoPago.EFECTIVO:
          totals.total_efectivo = parseFloat(p.total) || 0;
          break;
        case MetodoPago.DATAFONO:
          totals.total_datafono = parseFloat(p.total) || 0;
          break;
        case MetodoPago.NEQUI:
          totals.total_nequi = parseFloat(p.total) || 0;
          break;
        case MetodoPago.DAVIPLATA:
          totals.total_daviplata = parseFloat(p.total) || 0;
          break;
        case MetodoPago.BANCOLOMBIA:
          totals.total_bancolombia = parseFloat(p.total) || 0;
          break;
      }
    });

    const cierre = this.cierreRepository.create({
      operador_id: data.operador_id,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      total_efectivo: totals.total_efectivo,
      total_datafono: totals.total_datafono,
      total_nequi: totals.total_nequi,
      total_daviplata: totals.total_daviplata,
      total_bancolombia: totals.total_bancolombia,
      observaciones: data.observaciones,
    });

    return await this.cierreRepository.save(cierre);
  }

  async getDailyReport(date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tickets = await this.ticketRepository.count({
      where: {
        horario_ingreso: Between(startOfDay, endOfDay),
      },
    });

    const exits = await this.ticketRepository.count({
      where: {
        horario_salida: Between(startOfDay, endOfDay),
      },
    });

    const income = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('SUM(pago.monto)', 'total')
      .where('pago.fecha_pago BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .andWhere('pago.estado = :estado', { estado: EstadoPago.COMPLETADO })
      .getRawOne();

    return {
      fecha: date.toISOString().split('T')[0],
      entradas: tickets,
      salidas: exits,
      ingresos: parseFloat(income?.total) || 0,
    };
  }

  async getDailyReportByTurn(date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const turnos = [
      { nombre: 'Matutino', inicio: 6, fin: 14 },
      { nombre: 'Vespertino', inicio: 14, fin: 22 },
      { nombre: 'Nocturno', inicio: 22, fin: 6 },
    ];

    const resultados = [];

    for (const turno of turnos) {
      let turnoInicio = new Date(startOfDay);
      turnoInicio.setHours(turno.inicio, 0, 0, 0);
      let turnoFin = new Date(startOfDay);
      
      if (turno.inicio > turno.fin) {
        turnoFin.setDate(turnoFin.getDate() + 1);
      }
      turnoFin.setHours(turno.fin, 0, 0, 0);

      if (turno.nombre === 'Nocturno') {
        turnoFin = new Date(startOfDay);
        turnoFin.setDate(turnoFin.getDate() + 1);
        turnoFin.setHours(6, 0, 0, 0);
      }

      const entradas = await this.ticketRepository
        .createQueryBuilder('ticket')
        .where('ticket.horario_ingreso BETWEEN :start AND :end', { start: turnoInicio, end: turnoFin })
        .getCount();

      const salidas = await this.ticketRepository
        .createQueryBuilder('ticket')
        .where('ticket.horario_salida BETWEEN :start AND :end', { start: turnoInicio, end: turnoFin })
        .getCount();

      const ingresosData = await this.pagoRepository
        .createQueryBuilder('pago')
        .select('pago.metodo', 'metodo')
        .addSelect('SUM(pago.monto)', 'total')
        .where('pago.fecha_pago BETWEEN :start AND :end', { start: turnoInicio, end: turnoFin })
        .andWhere('pago.estado = :estado', { estado: EstadoPago.COMPLETADO })
        .groupBy('pago.metodo')
        .getRawMany();

      const ingresos: any = { total: 0 };
      ingresosData.forEach((p: any) => {
        const valor = parseFloat(p.total) || 0;
        ingresos.total += valor;
        switch (p.metodo) {
          case MetodoPago.EFECTIVO: ingresos.efectivo = valor; break;
          case MetodoPago.DATAFONO: ingresos.datafono = valor; break;
          case MetodoPago.NEQUI: ingresos.nequi = valor; break;
          case MetodoPago.DAVIPLATA: ingresos.daviplata = valor; break;
          case MetodoPago.BANCOLOMBIA: ingresos.bancolombia = valor; break;
        }
      });

      resultados.push({
        turno: turno.nombre,
        horaInicio: `${turno.inicio}:00`,
        horaFin: `${turno.fin}:00`,
        entradas,
        salidas,
        ingresos: ingresos.total || 0,
        efectivo: ingresos.efectivo || 0,
        datafono: ingresos.datafono || 0,
        nequi: ingresos.nequi || 0,
        daviplata: ingresos.daviplata || 0,
        bancolombia: ingresos.bancolombia || 0,
      });
    }

    return {
      fecha: date.toISOString().split('T')[0],
      turnos: resultados,
      totalDia: resultados.reduce((sum, t) => sum + t.ingresos, 0),
    };
  }

  async getResumenGeneral(): Promise<any> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const totalTickets = await this.ticketRepository.count();
    const ticketsActivos = await this.ticketRepository.count({ where: { estado: 'ACTIVO' as any } });
    const ticketsFinalizados = await this.ticketRepository.count({ where: { estado: 'FINALIZADO' as any } });

    const ingresosDia = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('SUM(pago.monto)', 'total')
      .where('pago.fecha_pago BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .andWhere('pago.estado = :estado', { estado: EstadoPago.COMPLETADO })
      .getRawOne();

    const ingresosMes = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('SUM(pago.monto)', 'total')
      .where('pago.fecha_pago BETWEEN :start AND :end', { start: startOfMonth, end: endOfMonth })
      .andWhere('pago.estado = :estado', { estado: EstadoPago.COMPLETADO })
      .getRawOne();

    const metodosPago = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('pago.metodo', 'metodo')
      .addSelect('SUM(pago.monto)', 'total')
      .where('pago.fecha_pago BETWEEN :start AND :end', { start: startOfMonth, end: endOfMonth })
      .andWhere('pago.estado = :estado', { estado: EstadoPago.COMPLETADO })
      .groupBy('pago.metodo')
      .getRawMany();

    const pagosPorMetodo: any = {};
    metodosPago.forEach((p: any) => {
      pagosPorMetodo[p.metodo] = parseFloat(p.total) || 0;
    });

    return {
      totalTickets,
      ticketsActivos,
      ticketsFinalizados,
      ingresosDia: parseFloat(ingresosDia?.total) || 0,
      ingresosMes: parseFloat(ingresosMes?.total) || 0,
      pagosPorMetodo,
    };
  }
}
