import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las facturas' })
  @ApiResponse({ status: 200, description: 'Lista de facturas' })
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener factura por ID' })
  @ApiResponse({ status: 200, description: 'Factura encontrada' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findById(+id);
  }

  @Get('ticket/:ticketId')
  @ApiOperation({ summary: 'Obtener factura por ticket' })
  @ApiResponse({ status: 200, description: 'Factura del ticket' })
  findByTicket(@Param('ticketId') ticketId: string) {
    return this.invoicesService.findByTicket(+ticketId);
  }

  @Get('cufe/:cufe')
  @ApiOperation({ summary: 'Obtener factura por CUFE' })
  @ApiResponse({ status: 200, description: 'Factura encontrada' })
  findByCufe(@Param('cufe') cufe: string) {
    return this.invoicesService.findByCufe(cufe);
  }

  @Post()
  @ApiOperation({ summary: 'Crear factura electronica' })
  @ApiResponse({ status: 201, description: 'Factura creada' })
  create(@Body() createInvoiceDto: {
    ticket_id: number;
    nit: string;
    nombre: string;
    email?: string;
  }) {
    return this.invoicesService.createInvoice(createInvoiceDto.ticket_id, {
      nit: createInvoiceDto.nit,
      nombre: createInvoiceDto.nombre,
      email: createInvoiceDto.email,
    });
  }
}
