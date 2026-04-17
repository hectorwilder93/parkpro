import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Espacio, EstadoEspacio } from '../../database/entities';

const TIPOS_ESPACIO = ['Automovil', 'Motocicleta', 'Camioneta', 'Discapacitados'];

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Espacio)
    private espacioRepository: Repository<Espacio>,
  ) {}

  async findAll(): Promise<Espacio[]> {
    const spaces = await this.espacioRepository.find({ order: { id: 'ASC' } });
    if (spaces.length === 0) {
      await this.setupSpaces();
      return this.espacioRepository.find({ order: { id: 'ASC' } });
    }
    return spaces;
  }

  async findByFloor(floor: number): Promise<Espacio[]> {
    return this.findAll();
  }

  async findAvailable(tipo: string): Promise<Espacio> {
    const espacio = await this.espacioRepository.findOne({
      where: { tipo_permitido: tipo, estado: EstadoEspacio.DISPONIBLE },
      order: { id: 'ASC' },
    });
    
    return espacio;
  }

  async findById(id: string): Promise<Espacio> {
    const espacio = await this.espacioRepository.findOne({ where: { id } });
    if (!espacio) {
      throw new NotFoundException(`Espacio ${id} no encontrado`);
    }
    return espacio;
  }

  async occupySpace(id: string): Promise<Espacio> {
    const espacio = await this.findById(id);
    espacio.estado = EstadoEspacio.OCUPADO;
    return this.espacioRepository.save(espacio);
  }

  async freeSpace(id: string): Promise<Espacio> {
    const espacio = await this.findById(id);
    espacio.estado = EstadoEspacio.DISPONIBLE;
    return this.espacioRepository.save(espacio);
  }

  async getStats(): Promise<{ total: number; disponibles: number; ocupados: number; reservados: number }> {
    const total = await this.espacioRepository.count();
    const disponibles = await this.espacioRepository.count({ where: { estado: EstadoEspacio.DISPONIBLE } });
    const ocupados = await this.espacioRepository.count({ where: { estado: EstadoEspacio.OCUPADO } });
    const reservados = await this.espacioRepository.count({ where: { estado: EstadoEspacio.RESERVADO } });

    return { total, disponibles, ocupados, reservados };
  }

  async create(data: { id: string; numero: number; seccion: string; tipo_permitido: string }): Promise<Espacio> {
    const existing = await this.espacioRepository.findOne({ where: { id: data.id } });
    if (existing) {
      throw new BadRequestException(`El espacio ${data.id} ya existe`);
    }

    const espacio = this.espacioRepository.create({
      id: data.id,
      numero: data.numero,
      seccion: data.seccion,
      tipo_permitido: data.tipo_permitido,
      estado: EstadoEspacio.DISPONIBLE,
    });

    return this.espacioRepository.save(espacio);
  }

  async update(id: string, data: { numero?: number; seccion?: string; tipo_permitido?: string; estado?: string }): Promise<Espacio> {
    const espacio = await this.findById(id);

    if (data.numero !== undefined) {
      espacio.numero = data.numero;
    }
    if (data.seccion !== undefined) espacio.seccion = data.seccion;
    if (data.tipo_permitido !== undefined) espacio.tipo_permitido = data.tipo_permitido;
    if (data.estado !== undefined) espacio.estado = data.estado as EstadoEspacio;

    return this.espacioRepository.save(espacio);
  }

  async remove(id: string): Promise<void> {
    const espacio = await this.findById(id);
    if (espacio.estado === EstadoEspacio.OCUPADO) {
      throw new BadRequestException('No se puede eliminar un espacio ocupado');
    }
    await this.espacioRepository.remove(espacio);
  }

  async setupSpaces(): Promise<{ message: string; count: number }> {
    const existingCount = await this.espacioRepository.count();
    if (existingCount > 0) {
      return { message: 'Espacios ya configurados', count: existingCount };
    }

    const spaces = [];

    for (const seccion of ['A', 'B', 'C', 'D', 'E']) {
      for (let numero = 1; numero <= 10; numero++) {
        let tipo: string;
        if (seccion === 'A' && (numero === 1 || numero === 2)) {
          tipo = 'Discapacitados';
        } else if (seccion === 'E') {
          tipo = 'Motocicleta';
        } else if (numero === 1 || numero === 2) {
          tipo = 'Camioneta';
        } else {
          tipo = 'Automovil';
        }

        const id = `${seccion}${numero.toString().padStart(2, '0')}`;
        const espacio = this.espacioRepository.create({
          id,
          numero,
          seccion,
          tipo_permitido: tipo,
          estado: EstadoEspacio.DISPONIBLE,
          coordenada_x: numero * 10,
          coordenada_y: seccion.charCodeAt(0) - 64,
        });
        spaces.push(espacio);
      }
    }

    await this.espacioRepository.save(spaces);
    return { message: `Espacios creados: ${spaces.length}`, count: spaces.length };
  }
}
