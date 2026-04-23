import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Factura, Ticket } from '../../database/entities';
import { v4 as uuidv4 } from 'uuid';
import { calcularImpuestoSustractivoSinRedondeo } from '../../common/utils/impuesto.utils';
import { ConfiguracionService } from '../configuracion/configuracion.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Factura)
    private facturaRepository: Repository<Factura>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    private configuracionService: ConfiguracionService,
  ) {}

  async findAll(): Promise<Factura[]> {
    return this.facturaRepository.find({
      order: { fecha_emision: 'DESC' },
      relations: ['ticket'],
    });
  }

  async findById(id: number): Promise<Factura> {
    const factura = await this.facturaRepository.findOne({
      where: { id },
      relations: ['ticket'],
    });
    
    if (!factura) {
      throw new NotFoundException(`Factura con ID ${id} no encontrada`);
    }
    
    return factura;
  }

  async findByTicket(ticketId: number): Promise<Factura> {
    return this.facturaRepository.findOne({
      where: { ticket_id: ticketId },
      relations: ['ticket'],
    });
  }

  async findByCufe(cufe: string): Promise<Factura> {
    const factura = await this.facturaRepository.findOne({
      where: { cufe },
      relations: ['ticket'],
    });
    
    if (!factura) {
      throw new NotFoundException(`Factura con CUFE ${cufe} no encontrada`);
    }
    
    return factura;
  }

  async createInvoice(ticketId: number, clienteData: {
    nit: string;
    nombre: string;
    email?: string;
  }): Promise<Factura> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }

    // Check if invoice already exists
    const existingInvoice = await this.findByTicket(ticketId);
    if (existingInvoice) {
      return existingInvoice;
    }

    // Get IVA rate from configuration
    const ivaTasa = await this.configuracionService.getIvaTasa();
    
    // ticket.monto is the TOTAL paid by customer
    // Calculate base (subtotal) and IVA using subtractive method
    // base = total / (1 + tasa)
    const totalPagado = ticket['monto'] || 0;
    const calculo = calcularImpuestoSustractivoSinRedondeo(totalPagado, ivaTasa);

    // Generate CUFE
    const cufe = this.generateCUFE(ticketId, calculo.base, calculo.iva, clienteData.nit);

    const factura = this.facturaRepository.create({
      ticket_id: ticketId,
      cufe,
      nit_cliente: clienteData.nit,
      nombre_cliente: clienteData.nombre,
      email_cliente: clienteData.email,
      subtotal: calculo.base,
      iva: calculo.iva,
      total: calculo.total,
    });

    return this.facturaRepository.save(factura);
  }

  private generateCUFE(ticketId: number, subtotal: number, iva: number, nit: string): string {
    const timestamp = Date.now();
    const data = `${ticketId}${subtotal}${iva}${nit}${timestamp}`;
    return `CUFE-${Buffer.from(data).toString('base64').substring(0, 49)}`;
  }
}
