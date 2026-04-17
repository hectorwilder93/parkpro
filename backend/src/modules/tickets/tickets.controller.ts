import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto, ExitTicketDto, SearchTicketDto, DigitalPaymentDto } from './dto/ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TicketsController {
  constructor(private ticketsService: TicketsService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los tickets' })
  @ApiResponse({ status: 200, description: 'Lista de tickets' })
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener tickets activos' })
  @ApiResponse({ status: 200, description: 'Tickets activos' })
  findActive() {
    return this.ticketsService.findActive();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadi�sticas de tickets' })
  @ApiResponse({ status: 200, description: 'Estadi�sticas' })
  getStats() {
    return this.ticketsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ticket por ID' })
  @ApiResponse({ status: 200, description: 'Ticket encontrado' })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findById(+id);
  }

  @Post('search')
  @ApiOperation({ summary: 'Buscar ticket por codigo o placa' })
  @ApiResponse({ status: 200, description: 'Ticket encontrado' })
  search(@Body() searchDto: SearchTicketDto) {
    return this.ticketsService.findByCode(searchDto.codigo_barras || searchDto.placa);
  }

  @Post('entry')
  @ApiOperation({ summary: 'Registrar entrada de vehi�culo' })
  @ApiResponse({ status: 201, description: 'Entrada registrada' })
  @ApiResponse({ status: 400, description: 'No hay espacios disponibles' })
  registerEntry(@Body() createTicketDto: CreateTicketDto, @Request() req) {
    return this.ticketsService.registerEntry({
      ...createTicketDto,
      usuario_id: req.user.id,
    });
  }

  @Post('exit')
  @ApiOperation({ summary: 'Procesar salida de vehi�culo' })
  @ApiResponse({ status: 200, description: 'Salida procesada' })
  @ApiResponse({ status: 400, description: 'Ticket no valido' })
  processExit(@Body() exitTicketDto: ExitTicketDto, @Request() req) {
    return this.ticketsService.processExit(
      exitTicketDto.codigo_barras,
      req.user.id,
      exitTicketDto.metodo_pago,
      exitTicketDto.monto,
    );
  }

  @Get(':id/rate')
  @ApiOperation({ summary: 'Calcular tarifa' })
  @ApiResponse({ status: 200, description: 'Tarifa calculada' })
  calculateRate(@Param('id') id: string) {
    return this.ticketsService.calculateRate(+id);
  }

  @Post('digital-payment')
  @ApiOperation({ summary: 'Procesar pago digital (Nequi/Daviplata)' })
  @ApiResponse({ status: 200, description: 'Pago digital procesado' })
  @ApiResponse({ status: 400, description: 'Ticket no válido o error en el pago' })
  processDigitalPayment(@Body() digitalPaymentDto: DigitalPaymentDto, @Request() req) {
    return this.ticketsService.processDigitalPayment(digitalPaymentDto, req.user.id);
  }
}
