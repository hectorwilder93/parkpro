import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(private auditService: AuditService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener logs de auditori­a' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Lista de logs' })
  findAll(@Query('limit') limit?: string) {
    return this.auditService.findAll(limit ? +limit : 100);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Obtener actividad reciente' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Actividad reciente' })
  getRecentActivity(@Query('limit') limit?: string) {
    return this.auditService.getRecentActivity(limit ? +limit : 20);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener logs por usuario' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Logs del usuario' })
  findByUser(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return this.auditService.findByUser(+userId, limit ? +limit : 50);
  }

  @Get('table/:tableName')
  @ApiOperation({ summary: 'Obtener logs por tabla' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Logs de la tabla' })
  findByTable(@Param('tableName') tableName: string, @Query('limit') limit?: string) {
    return this.auditService.findByTable(tableName, limit ? +limit : 50);
  }

  @Get('range')
  @ApiOperation({ summary: 'Obtener logs por rango de fechas' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Logs en el rango' })
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.auditService.findByDateRange(new Date(startDate), new Date(endDate));
  }
}
