import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { EspaciosEmpleadosService } from './espacios-empleados.service';
import { CreateEspacioEmpleadoDto, UpdateEspacioEmpleadoDto } from './dto/espacio-empleado.dto';
import { RolUsuario } from '../../database/entities';

@Controller('espacios-empleados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EspaciosEmpleadosController {
  constructor(private readonly espaciosEmpleadosService: EspaciosEmpleadosService) {}

  @Get('diagnostico')
  @Roles(RolUsuario.ADMINISTRADOR)
  async diagnostico() {
    return this.espaciosEmpleadosService.diagnostico();
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async findAll() {
    return this.espaciosEmpleadosService.findAll();
  }

  @Get('activos')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async findActivos() {
    return this.espaciosEmpleadosService.findActivos();
  }

  @Get('empleado/:cedula')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async findByEmpleado(@Param('cedula') cedula: string) {
    return this.espaciosEmpleadosService.findByEmpleado(cedula);
  }

  @Get('espacio/:espacioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async findByEspacio(@Param('espacioId') espacioId: string) {
    return this.espaciosEmpleadosService.findByEspacio(espacioId);
  }

  @Get('para-empleados')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async getEspaciosParaEmpleados() {
    return this.espaciosEmpleadosService.getEspaciosParaEmpleados();
  }

  @Get('reporte-nomina')
  async getReporteNomina(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    console.log('Controller getReporteNomina - fechaInicio:', fechaInicio, 'fechaFin:', fechaFin);
    return this.espaciosEmpleadosService.getReporteNomina(fechaInicio, fechaFin);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async findById(@Param('id') id: string) {
    return this.espaciosEmpleadosService.findById(parseInt(id));
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async create(@Body() data: CreateEspacioEmpleadoDto) {
    return this.espaciosEmpleadosService.create(data);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async update(@Param('id') id: string, @Body() data: UpdateEspacioEmpleadoDto) {
    return this.espaciosEmpleadosService.update(parseInt(id), data);
  }

  @Put(':id/desactivar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  async deactivate(@Param('id') id: string) {
    return this.espaciosEmpleadosService.deactivate(parseInt(id));
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async remove(@Param('id') id: string) {
    await this.espaciosEmpleadosService.remove(parseInt(id));
    return { message: 'Asignación eliminada correctamente' };
  }
}
