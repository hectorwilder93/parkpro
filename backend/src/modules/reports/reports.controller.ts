import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los reportes' })
  @ApiResponse({ status: 200, description: 'Lista de reportes' })
  findAllReports() {
    return this.reportsService.findAllReports();
  }

  @Get('closures')
  @ApiOperation({ summary: 'Obtener todos los cierres de turno' })
  @ApiResponse({ status: 200, description: 'Lista de cierres' })
  findAllClosures() {
    return this.reportsService.findAllClosures();
  }

  @Get('daily')
  @ApiOperation({ summary: 'Obtener reporte diario' })
  @ApiQuery({ name: 'date', required: false })
  @ApiResponse({ status: 200, description: 'Reporte del día' })
  getDailyReport(@Query('date') date?: string) {
    return this.reportsService.getDailyReport(date ? new Date(date) : new Date());
  }

  @Get('daily-by-turn')
  @ApiOperation({ summary: 'Obtener reporte diario por turno' })
  @ApiQuery({ name: 'date', required: false })
  @ApiResponse({ status: 200, description: 'Reporte del día por turno' })
  getDailyReportByTurn(@Query('date') date?: string) {
    return this.reportsService.getDailyReportByTurn(date ? new Date(date) : new Date());
  }

  @Post()
  @ApiOperation({ summary: 'Crear reporte' })
  @ApiResponse({ status: 201, description: 'Reporte creado' })
  createReport(@Body() createReportDto: {
    tipo: string;
    titulo: string;
    contenido_json: Record<string, any>;
    fecha_desde?: string;
    fecha_hasta?: string;
  }, @Request() req) {
    return this.reportsService.createReport({
      ...createReportDto,
      usuario_id_genera: req.user.id,
      fecha_desde: createReportDto.fecha_desde ? new Date(createReportDto.fecha_desde) : undefined,
      fecha_hasta: createReportDto.fecha_hasta ? new Date(createReportDto.fecha_hasta) : undefined,
    });
  }

  @Post('closure')
  @ApiOperation({ summary: 'Crear cierre de turno' })
  @ApiResponse({ status: 201, description: 'Cierre creado' })
  createClosure(@Body() createClosureDto: {
    fecha_inicio: string;
    fecha_fin: string;
    observaciones?: string;
  }, @Request() req) {
    return this.reportsService.createClosure({
      operador_id: req.user.id,
      fecha_inicio: new Date(createClosureDto.fecha_inicio),
      fecha_fin: new Date(createClosureDto.fecha_fin),
      observaciones: createClosureDto.observaciones,
    });
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Obtener resumen general del sistema' })
  @ApiResponse({ status: 200, description: 'Resumen general' })
  getResumenGeneral() {
    return this.reportsService.getResumenGeneral();
  }
}
