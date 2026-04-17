import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RolUsuario } from '../../database/entities';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Post('setup')
  @ApiOperation({ summary: 'Setup inicial - crear usuario admin' })
  @ApiResponse({ status: 201, description: 'Usuario admin creado' })
  @ApiResponse({ status: 200, description: 'Usuario admin ya existe' })
  setup() {
    return this.usersService.setupAdmin();
  }

  @Post('setup-demo')
  @ApiOperation({ summary: 'Crear usuarios demo (supervisor, operadores, tecnico)' })
  @ApiResponse({ status: 201, description: 'Usuarios demo creados' })
  @ApiResponse({ status: 200, description: 'Usuarios demo ya existen' })
  setupDemo() {
    return this.usersService.setupDemoUsers();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('system')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener usuarios del sistema (excluye empleados con espacio)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios del sistema' })
  findSystemUsers() {
    return this.usersService.findSystemUsers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 400, description: 'Datos invalidos' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: 'Cambiar contrasena' })
  @ApiResponse({ status: 200, description: 'Contrasena cambiada' })
  @ApiResponse({ status: 400, description: 'Contrasena incorrecta' })
  changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(+id, changePasswordDto.oldPassword, changePasswordDto.newPassword);
  }
}
