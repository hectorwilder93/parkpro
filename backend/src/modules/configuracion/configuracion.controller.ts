import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfiguracionService } from './configuracion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RolUsuario } from '../../database/entities';

@ApiTags('configuracion')
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private configuracionService: ConfiguracionService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener configuración del sistema' })
  @ApiResponse({ status: 200, description: 'Configuración actual' })
  getConfiguracion() {
    return this.configuracionService.getConfiguracion();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Guardar configuración del sistema' })
  @ApiResponse({ status: 200, description: 'Configuración guardada' })
  guardarConfiguracion(@Body() config: any) {
    return this.configuracionService.guardarConfiguracion(config);
  }
}
