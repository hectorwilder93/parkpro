import { IsString, IsNumber, IsBoolean, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class CreateEspacioEmpleadoDto {
  @IsString()
  espacio_id: string;

  @IsString()
  cedula: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentaje_descuento?: number = 100;

  @IsBoolean()
  @IsOptional()
  activo?: boolean = true;

  @IsDateString()
  @IsOptional()
  fecha_inicio?: string;

  @IsDateString()
  @IsOptional()
  fecha_fin?: string;
}

export class UpdateEspacioEmpleadoDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentaje_descuento?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsDateString()
  @IsOptional()
  fecha_inicio?: string;

  @IsDateString()
  @IsOptional()
  fecha_fin?: string;
}

export class AsignarEspacioEmpleadoDto {
  @IsString()
  espacio_id: string;

  @IsString()
  cedula: string;

  @IsBoolean()
  @IsOptional()
  es_para_empleado?: boolean = true;
}

export class DesasignarEspacioDto {
  @IsString()
  espacio_id: string;
}
