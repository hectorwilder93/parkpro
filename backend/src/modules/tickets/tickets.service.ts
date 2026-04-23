import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, EstadoTicket } from '../../database/entities';
import { CreateTicketDto, SearchTicketDto, DigitalPaymentDto } from './dto/ticket.dto';
import { VehiclesService } from '../vehicles/vehicles.service';
import { SpacesService } from '../spaces/spaces.service';
import { PaymentsService } from '../payments/payments.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { v4 as uuidv4 } from 'uuid';
import { getTarifaPorTipo, esTipoVehiculoEmpleado } from '../../common/utils/tarifa.utils';
import { calcularImpuestoSustractivo, esPagoEnEfectivo, formatearMontoParaPago } from '../../common/utils/impuesto.utils';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    private vehiclesService: VehiclesService,
    @Inject(forwardRef(() => SpacesService))
    private spacesService: SpacesService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    private configuracionService: ConfiguracionService,
  ) {}

  async findAll(): Promise<Ticket[]> {
    return this.ticketRepository.find({
      order: { horario_ingreso: 'DESC' },
    });
  }

  async findActive(): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { estado: EstadoTicket.ACTIVO },
      order: { horario_ingreso: 'DESC' },
    });
  }

  async findById(id: number): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }
    
    return ticket;
  }

  async findByCode(codigoBarras: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { codigo_barras: codigoBarras },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket con código ${codigoBarras} no encontrado`);
    }
    
    return ticket;
  }

  async findActiveByPlate(placa: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { placa, estado: EstadoTicket.ACTIVO },
    });
    
    return ticket;
  }

  async registerEntry(createTicketDto: CreateTicketDto): Promise<Ticket> {
    try {
      const { placa, tipo_vehiculo, notas } = createTicketDto;
      const usuario_id = createTicketDto.usuario_id;

      const existingTicket = await this.findActiveByPlate(placa);
      if (existingTicket) {
        throw new BadRequestException(`El vehículo ${placa} ya tiene un ticket activo`);
      }

      const tipoNormalizado = this.normalizarTipoVehiculo(tipo_vehiculo);
      
      const vehiculo = await this.vehiclesService.findOrCreate(placa, tipoNormalizado);

      const espacio = await this.spacesService.findAvailable(tipoNormalizado);
      if (!espacio) {
        throw new BadRequestException('No hay espacios disponibles para este tipo de vehículo');
      }

      const fecha = new Date();
      const codigoBarras = `${fecha.getFullYear().toString().slice(-2)}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}${placa.replace(/[^A-Z0-9]/g, '')}${uuidv4().substring(0, 6).toUpperCase()}`;

      const ticket = this.ticketRepository.create({
        codigo_barras: codigoBarras,
        placa: placa,
        tipo_vehiculo: tipoNormalizado,
        horario_ingreso: new Date(),
        espacio_id: espacio.id,
        usuario_id_entrada: usuario_id,
        notas: notas,
      });

      const savedTicket = await this.ticketRepository.save(ticket);

      await this.spacesService.occupySpace(espacio.id);

      return savedTicket;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error en registerEntry:', error);
      throw new BadRequestException(`Error al registrar entrada: ${error.message}`);
    }
  }

  private normalizarTipoVehiculo(tipo: string): string {
    const mapa: Record<string, string> = {
      'automovil': 'Automóvil',
      'Automovil': 'Automóvil',
      'AUTOMOVIL': 'Automóvil',
      'automóvil': 'Automóvil',
      'Automóvil': 'Automóvil',
      'AUTOMÓVIL': 'Automóvil',
      'motocicleta': 'Motocicleta',
      'Motocicleta': 'Motocicleta',
      'MOTOCICLETA': 'Motocicleta',
      'camioneta': 'Camioneta',
      'Camioneta': 'Camioneta',
      'CAMIONETA': 'Camioneta',
      'discapacitados': 'Discapacitados',
      'Discapacitados': 'Discapacitados',
      'DISCAPACITADOS': 'Discapacitados',
    };
    
    const normalizado = mapa[tipo];
    if (!normalizado) {
      throw new BadRequestException(`Tipo de vehículo inválido: ${tipo}. Valores válidos: Automóvil, Motocicleta, Camioneta, Discapacitados`);
    }
    return normalizado;
  }

  async processExit(codigoBarras: string, usuarioId: number, metodoPago: string, monto: number): Promise<Ticket> {
    const ticket = await this.findByCode(codigoBarras);
    
    if (ticket.estado !== EstadoTicket.ACTIVO) {
      throw new BadRequestException('El ticket no está activo');
    }

    // Check if payment already exists
    const existingPayment = await this.paymentsService.findByTicket(ticket.id);
    if (existingPayment) {
      throw new BadRequestException('Este ticket ya fue pagado');
    }

    // Normalize payment method to uppercase
    const metodoNormalizado = metodoPago.toUpperCase();
    
    // Apply rounding based on payment method
    const esEfectivo = esPagoEnEfectivo(metodoNormalizado);
    const montoFormateado = formatearMontoParaPago(monto, esEfectivo, 50);

    // Process payment
    await this.paymentsService.createPayment({
      ticket_id: ticket.id,
      monto: montoFormateado,
      metodo: metodoNormalizado as any,
      usuario_id_procesa: usuarioId,
    });

    // Update ticket
    ticket.estado = EstadoTicket.FINALIZADO;
    ticket.horario_salida = new Date();
    ticket.usuario_id_salida = usuarioId;
    
    const updatedTicket = await this.ticketRepository.save(ticket);

    // Free space
    if (ticket.espacio_id) {
      await this.spacesService.freeSpace(ticket.espacio_id);
    }

    return this.findById(updatedTicket.id);
  }

  async calculateRate(ticketId: number): Promise<{ horas: number; monto: number; tarifa: number }> {
    const ticket = await this.findById(ticketId);
    
    const diffMs = new Date().getTime() - new Date(ticket.horario_ingreso).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    const tarifas = await this.configuracionService.getTarifas();
    const esEmpleado = esTipoVehiculoEmpleado(ticket.tipo_vehiculo);
    const tarifa = esEmpleado 
      ? tarifas.tarifaEmpleado 
      : getTarifaPorTipo(ticket.tipo_vehiculo, tarifas);
    
    const horasCompletas = Math.floor(diffMinutes / 60);
    const minutosRestantes = diffMinutes % 60;
    const precioMinuto = tarifa / 60;
    
    let monto: number;
    let horasCobrar: number;
    
    if (diffMinutes <= 0) {
      horasCobrar = 0;
      monto = 0;
    } else if (diffMinutes <= 60) {
      horasCobrar = 1;
      monto = tarifa;
    } else {
      horasCobrar = horasCompletas + (minutosRestantes > 0 ? 1 : 0);
      monto = (horasCompletas * tarifa) + Math.round(minutosRestantes * precioMinuto);
    }
    
    return { horas: horasCobrar, monto, tarifa };
  }

  async processDigitalPayment(digitalPaymentDto: DigitalPaymentDto, usuarioId: number): Promise<Ticket> {
    const ticket = await this.findByCode(digitalPaymentDto.codigo_barras);
    
    if (ticket.estado !== EstadoTicket.ACTIVO) {
      throw new BadRequestException('El ticket no está activo');
    }

    const metodoPago = digitalPaymentDto.metodo_pago.toUpperCase();
    
    // Digital payments keep decimals (no rounding)
    const esEfectivo = esPagoEnEfectivo(metodoPago);
    const montoFormateado = formatearMontoParaPago(digitalPaymentDto.monto, esEfectivo, 50);
    
    // Process payment
    const pago = await this.paymentsService.createPayment({
      ticket_id: ticket.id,
      monto: montoFormateado,
      metodo: metodoPago as any,
      usuario_id_procesa: usuarioId,
      transaccion_id: `DIG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    });

    // Update ticket
    ticket.estado = EstadoTicket.FINALIZADO;
    ticket.horario_salida = new Date();
    ticket.usuario_id_salida = usuarioId;
    
    const updatedTicket = await this.ticketRepository.save(ticket);

    // Free space
    if (ticket.espacio_id) {
      await this.spacesService.freeSpace(ticket.espacio_id);
    }

    return this.findById(updatedTicket.id);
  }

  async getStats(): Promise<{ active: number; finished: number; total: number }> {
    const active = await this.ticketRepository.count({ where: { estado: EstadoTicket.ACTIVO } });
    const finished = await this.ticketRepository.count({ where: { estado: EstadoTicket.FINALIZADO } });
    
    return { active, finished, total: active + finished };
  }
}
