import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoVehiculo } from '../../../database/entities';

export class CreateTicketDto {
  @ApiProperty({ example: 'ABC-123' })
  @IsString()
  @IsNotEmpty()
  placa: string;

  @ApiProperty({ enum: TipoVehiculo, example: 'Automovil' })
  @IsString()
  @IsNotEmpty()
  tipo_vehiculo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  usuario_id?: number;
}

export class SearchTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigo_barras?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placa?: string;
}

export class ExitTicketDto {
  @ApiProperty({ example: '240111ABC123XYZ' })
  @IsString()
  @IsNotEmpty()
  codigo_barras: string;

  @ApiProperty({ example: 'EFECTIVO' })
  @IsString()
  @IsNotEmpty()
  metodo_pago: string;

  @ApiProperty({ example: 8000 })
  @IsNotEmpty()
  @IsNumber()
  monto: number;
}

export class DigitalPaymentDto {
  @ApiProperty({ example: '260313ABC123XYZ' })
  @IsString()
  @IsNotEmpty()
  codigo_barras: string;

  @ApiProperty({ example: 'NEQUI' })
  @IsString()
  @IsNotEmpty()
  metodo_pago: string;

  @ApiProperty({ example: 8000 })
  @IsNotEmpty()
  @IsNumber()
  monto: number;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'correo@ejemplo.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia?: string;
}
