import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los pagos' })
  @ApiResponse({ status: 200, description: 'Lista de pagos' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadi­sticas de pagos por metodo' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Estadi­sticas por metodo' })
  getStatsByMethod(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.getStatsByMethod(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('daily')
  @ApiOperation({ summary: 'Obtener ingresos del dia' })
  @ApiQuery({ name: 'date', required: false })
  @ApiResponse({ status: 200, description: 'Ingresos del dia' })
  getDailyIncome(@Query('date') date?: string) {
    return this.paymentsService.getDailyIncome(date ? new Date(date) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pago por ID' })
  @ApiResponse({ status: 200, description: 'Pago encontrado' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findById(+id);
  }

  @Get('ticket/:ticketId')
  @ApiOperation({ summary: 'Obtener pago por ticket' })
  @ApiResponse({ status: 200, description: 'Pago del ticket' })
  findByTicket(@Param('ticketId') ticketId: string) {
    return this.paymentsService.findByTicket(+ticketId);
  }
}
