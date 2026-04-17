import { IsString, IsNotEmpty, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario, TurnoOperador } from '../../../database/entities';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Usuario o email' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'juanperez' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'juan@parkpro.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: RolUsuario })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiPropertyOptional({ enum: TurnoOperador })
  @IsOptional()
  @IsEnum(TurnoOperador)
  turno?: TurnoOperador;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  user: {
    id: number;
    nombre: string;
    username: string;
    email: string;
    rol: string;
    turno?: string;
  };
}
