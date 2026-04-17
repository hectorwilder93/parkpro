import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo, TipoVehiculo } from '../../database/entities';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

const TIPOS_VALIDOS = ['Automóvil', 'Motocicleta', 'Camioneta', 'Discapacitados'];

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehiculo)
    private vehiculoRepository: Repository<Vehiculo>,
  ) {}

  async findAll(): Promise<Vehiculo[]> {
    return this.vehiculoRepository.find({ order: { fecha_registro: 'DESC' } });
  }

  async findByPlaca(placa: string): Promise<Vehiculo> {
    const vehiculo = await this.vehiculoRepository.findOne({ where: { placa } });
    if (!vehiculo) {
      throw new NotFoundException(`Vehículo con placa ${placa} no encontrado`);
    }
    return vehiculo;
  }

  private normalizarTipoVehiculo(tipo: string): TipoVehiculo {
    if (!tipo) {
      throw new BadRequestException('El tipo de vehículo es requerido');
    }
    
    const mapa: Record<string, TipoVehiculo> = {
      'automovil': TipoVehiculo.AUTOMOVIL,
      'Automovil': TipoVehiculo.AUTOMOVIL,
      'AUTOMOVIL': TipoVehiculo.AUTOMOVIL,
      'automóvil': TipoVehiculo.AUTOMOVIL,
      'Automóvil': TipoVehiculo.AUTOMOVIL,
      'AUTOMÓVIL': TipoVehiculo.AUTOMOVIL,
      'motocicleta': TipoVehiculo.MOTOCICLETA,
      'Motocicleta': TipoVehiculo.MOTOCICLETA,
      'MOTOCICLETA': TipoVehiculo.MOTOCICLETA,
      'camioneta': TipoVehiculo.CAMIONETA,
      'Camioneta': TipoVehiculo.CAMIONETA,
      'CAMIONETA': TipoVehiculo.CAMIONETA,
      'discapacitados': TipoVehiculo.DISCAPACITADOS,
      'Discapacitados': TipoVehiculo.DISCAPACITADOS,
      'DISCAPACITADOS': TipoVehiculo.DISCAPACITADOS,
    };
    
    const normalizado = mapa[tipo];
    if (!normalizado) {
      throw new BadRequestException(`Tipo de vehículo inválido: ${tipo}. Valores válidos: ${TIPOS_VALIDOS.join(', ')}`);
    }
    return normalizado;
  }

  async findOrCreate(placa: string, tipo: string): Promise<Vehiculo> {
    let vehiculo = await this.vehiculoRepository.findOne({ where: { placa } });
    
    if (!vehiculo) {
      const tipoNormalizado = this.normalizarTipoVehiculo(tipo);
      vehiculo = this.vehiculoRepository.create({ placa, tipo: tipoNormalizado });
      vehiculo = await this.vehiculoRepository.save(vehiculo);
    }
    
    return vehiculo;
  }

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehiculo> {
    const tipoNormalizado = this.normalizarTipoVehiculo(createVehicleDto.tipo);
    const vehiculo = this.vehiculoRepository.create({ ...createVehicleDto, tipo: tipoNormalizado });
    return this.vehiculoRepository.save(vehiculo);
  }

  async update(placa: string, updateVehicleDto: UpdateVehicleDto): Promise<Vehiculo> {
    const vehiculo = await this.findByPlaca(placa);
    if (updateVehicleDto.tipo) {
      updateVehicleDto.tipo = this.normalizarTipoVehiculo(updateVehicleDto.tipo) as any;
    }
    Object.assign(vehiculo, updateVehicleDto);
    return this.vehiculoRepository.save(vehiculo);
  }

  async remove(placa: string): Promise<void> {
    const vehiculo = await this.findByPlaca(placa);
    await this.vehiculoRepository.remove(vehiculo);
  }

  async findEmployees(): Promise<Vehiculo[]> {
    return this.vehiculoRepository.find({ where: { es_empleado: true } });
  }
}
