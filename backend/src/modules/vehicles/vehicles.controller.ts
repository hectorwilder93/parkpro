import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RolUsuario } from '../../database/entities';

@ApiTags('vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los vehi­culos' })
  @ApiResponse({ status: 200, description: 'Lista de vehi­culos' })
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get('employees')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener vehi­culos de empleados' })
  @ApiResponse({ status: 200, description: 'Lista de vehi­culos de empleados' })
  findEmployees() {
    return this.vehiclesService.findEmployees();
  }

  @Get(':placa')
  @ApiOperation({ summary: 'Obtener vehi­culo por placa' })
  @ApiResponse({ status: 200, description: 'Vehiculo encontrado' })
  @ApiResponse({ status: 404, description: 'Vehi­culo no encontrado' })
  findOne(@Param('placa') placa: string) {
    return this.vehiclesService.findByPlaca(placa);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Crear nuevo vehi­culo' })
  @ApiResponse({ status: 201, description: 'Vehi­culo creado' })
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Put(':placa')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar vehiculo' })
  @ApiResponse({ status: 200, description: 'Vehi­culo actualizado' })
  update(@Param('placa') placa: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(placa, updateVehicleDto);
  }

  @Delete(':placa')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar vehi­culo' })
  @ApiResponse({ status: 200, description: 'Vehi­culo eliminado' })
  remove(@Param('placa') placa: string) {
    return this.vehiclesService.remove(placa);
  }
}
