import { Controller, Get, Param, Query, UseGuards, Post, Put, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SpacesService } from './spaces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { RolUsuario } from '../../database/entities';

@ApiTags('spaces')
@Controller('spaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SpacesController {
  constructor(private spacesService: SpacesService) { }

  @Post('setup')
  @ApiOperation({ summary: 'Setup inicial - crear espacios' })
  @ApiResponse({ status: 201, description: 'Espacios creados' })
  @ApiResponse({ status: 200, description: 'Espacios ya existen' })
  setup() {
    return this.spacesService.setupSpaces();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadí­sticas de espacios' })
  @ApiResponse({ status: 200, description: 'Estadísticas' })
  getStats() {
    return this.spacesService.getStats();
  }

  @Get('floor/:floor')
  @ApiOperation({ summary: 'Obtener espacios por piso' })
  @ApiResponse({ status: 200, description: 'Espacios del piso' })
  findByFloor(@Param('floor') floor: string) {
    return this.spacesService.findByFloor(+floor);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los espacios' })
  @ApiResponse({ status: 200, description: 'Lista de espacios' })
  findAll() {
    return this.spacesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener espacio por ID' })
  @ApiResponse({ status: 200, description: 'Espacio encontrado' })
  findOne(@Param('id') id: string) {
    return this.spacesService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear un nuevo espacio' })
  @ApiResponse({ status: 201, description: 'Espacio creado' })
  create(@Body() createSpaceDto: { id: string; numero: number; seccion: string; tipo_permitido: string }) {
    return this.spacesService.create(createSpaceDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar un espacio' })
  @ApiResponse({ status: 200, description: 'Espacio actualizado' })
  update(@Param('id') id: string, @Body() updateSpaceDto: { numero?: number; seccion?: string; tipo_permitido?: string; estado?: string }) {
    return this.spacesService.update(id, updateSpaceDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar un espacio' })
  @ApiResponse({ status: 200, description: 'Espacio eliminado' })
  remove(@Param('id') id: string) {
    return this.spacesService.remove(id);
  }
}
