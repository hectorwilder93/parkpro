import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AlarmsService } from './alarms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('alarms')
@Controller('alarms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AlarmsController {
  constructor(private alarmsService: AlarmsService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las alarmas' })
  @ApiResponse({ status: 200, description: 'Lista de alarmas' })
  findAll() {
    return this.alarmsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener alarmas activas' })
  @ApiResponse({ status: 200, description: 'Alarmas activas' })
  findActive() {
    return this.alarmsService.findActive();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadi­sticas de alarmas' })
  @ApiResponse({ status: 200, description: 'Estadisticas' })
  getStats() {
    return this.alarmsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener alarma por ID' })
  @ApiResponse({ status: 200, description: 'Alarma encontrada' })
  findOne(@Param('id') id: string) {
    return this.alarmsService.findById(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear alarma' })
  @ApiResponse({ status: 201, description: 'Alarma creada' })
  create(@Body() createAlarmDto: {
    tipo: string;
    severidad: string;
    mensaje: string;
    detalles?: Record<string, any>;
  }) {
    return this.alarmsService.create(createAlarmDto);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolver alarma' })
  @ApiResponse({ status: 200, description: 'Alarma resuelta' })
  resolve(@Param('id') id: string, @Request() req) {
    return this.alarmsService.resolve(+id, req.user.id);
  }
}
