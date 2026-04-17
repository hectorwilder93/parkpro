import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EspacioEmpleado, Espacio, Usuario, RolUsuario, TurnoOperador, EstadoEspacio } from '../../database/entities';
import { CreateEspacioEmpleadoDto, UpdateEspacioEmpleadoDto } from './dto/espacio-empleado.dto';

@Injectable()
export class EspaciosEmpleadosService {
  constructor(
    @InjectRepository(EspacioEmpleado)
    private espacioEmpleadoRepository: Repository<EspacioEmpleado>,
    @InjectRepository(Espacio)
    private espacioRepository: Repository<Espacio>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  private async crearOBuscarEmpleado(cedula: string, nombre?: string): Promise<Usuario> {
    try {
      let empleado = await this.usuarioRepository.findOne({ where: { cedula } });
      
      if (!empleado) {
        console.log('No existe empleado con cedula:', cedula, '- Creando nuevo...');
        
        let passwordHash: string;
        try {
          passwordHash = await bcrypt.hash(cedula, 10);
        } catch (bcryptError) {
          console.warn('bcrypt failed, using fallback hash');
          passwordHash = `fallback_${cedula}_${Date.now()}`;
        }
        
        let username = `emp_${cedula}`;
        let email = `empleado_${cedula}@parkpro.com`;
        let counter = 1;
        
        while (await this.usuarioRepository.findOne({ where: { username } })) {
          username = `emp_${cedula}_${counter}`;
          counter++;
        }
        
        counter = 1;
        while (await this.usuarioRepository.findOne({ where: { email } })) {
          email = `empleado_${cedula}_${counter}@parkpro.com`;
          counter++;
        }
        
        empleado = this.usuarioRepository.create({
          nombre: nombre || `Empleado ${cedula}`,
          cedula: cedula,
          username: username,
          email: email,
          password_hash: passwordHash,
          rol: 'Operador' as RolUsuario,
          turno: 'Rotativo' as TurnoOperador,
          activo: true,
        });
        
        console.log('Intentando crear empleado:', empleado);
        empleado = await this.usuarioRepository.save(empleado);
        console.log('Empleado creado exitosamente con ID:', empleado.id);
      } else {
        console.log('Empleado encontrado:', empleado.id, '- Cedula:', empleado.cedula);
      }
      
      return empleado;
    } catch (error: any) {
      console.error('Error en crearOBuscarEmpleado:', error);
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un usuario con esa cédula');
      }
      throw new BadRequestException(`Error al crear/buscar empleado: ${error.message}`);
    }
  }

  async findAll(): Promise<EspacioEmpleado[]> {
    try {
      const result = await this.espacioEmpleadoRepository
        .createQueryBuilder('ae')
        .leftJoinAndSelect('ae.espacio', 'espacio')
        .leftJoinAndSelect('ae.empleado', 'empleado')
        .orderBy('ae.fecha_creacion', 'DESC')
        .getMany();
      return result;
    } catch (error) {
      console.error('Error fetching asignaciones:', error);
      return [];
    }
  }

  async findActivos(): Promise<EspacioEmpleado[]> {
    try {
      const result = await this.espacioEmpleadoRepository
        .createQueryBuilder('ae')
        .leftJoinAndSelect('ae.espacio', 'espacio')
        .leftJoinAndSelect('ae.empleado', 'empleado')
        .where('ae.activo = :activo', { activo: true })
        .orderBy('ae.fecha_creacion', 'DESC')
        .getMany();
      return result;
    } catch (error) {
      console.error('Error fetching asignaciones activas:', error);
      return [];
    }
  }

  async diagnostico(): Promise<any> {
    try {
      const totalAsignaciones = await this.espacioEmpleadoRepository.count();
      const asignacionesActivas = await this.espacioEmpleadoRepository.count({ where: { activo: true } });
      
      const espaciosReservados = await this.espacioRepository
        .createQueryBuilder('espacio')
        .where('espacio.estado = :estado', { estado: EstadoEspacio.RESERVADO })
        .getCount();
      
      const espaciosParaEmpleado = await this.espacioRepository
        .createQueryBuilder('espacio')
        .where('espacio.es_para_empleado = :esParaEmpleado', { esParaEmpleado: true })
        .getCount();
      
      const usuariosConCedula = await this.usuarioRepository
        .createQueryBuilder('usuario')
        .where('usuario.cedula IS NOT NULL')
        .getCount();
      
      const totalUsuarios = await this.usuarioRepository.count();
      
      const sampleAsignaciones = await this.espacioEmpleadoRepository.find({
        take: 5,
        order: { fecha_creacion: 'DESC' }
      });
      
      return {
        totalAsignaciones,
        asignacionesActivas,
        espaciosReservados,
        espaciosParaEmpleado,
        usuariosConCedula,
        totalUsuarios,
        sampleAsignaciones,
        message: 'Diagnóstico completado exitosamente'
      };
    } catch (error) {
      console.error('Error en diagnostico:', error);
      return {
        error: error.message,
        stack: error.stack
      };
    }
  }

  async findByEmpleado(cedula: string): Promise<EspacioEmpleado[]> {
    try {
      const result = await this.espacioEmpleadoRepository
        .createQueryBuilder('ae')
        .leftJoinAndSelect('ae.espacio', 'espacio')
        .where('ae.cedula = :cedula', { cedula })
        .orderBy('ae.fecha_creacion', 'DESC')
        .getMany();
      return result;
    } catch (error) {
      console.error('Error fetching asignaciones por empleado:', error);
      return [];
    }
  }

  async findByEspacio(espacioId: string): Promise<EspacioEmpleado[]> {
    try {
      const result = await this.espacioEmpleadoRepository
        .createQueryBuilder('ae')
        .leftJoinAndSelect('ae.espacio', 'espacio')
        .where('ae.espacio_id = :espacioId', { espacioId })
        .orderBy('ae.fecha_creacion', 'DESC')
        .getMany();
      return result;
    } catch (error) {
      console.error('Error fetching asignaciones por espacio:', error);
      return [];
    }
  }

  async findById(id: number): Promise<EspacioEmpleado> {
    const asignacion = await this.espacioEmpleadoRepository.findOne({
      where: { id },
      relations: ['espacio', 'empleado'],
    });
    if (!asignacion) {
      throw new NotFoundException(`Asignación con ID ${id} no encontrada`);
    }
    return asignacion;
  }

  async create(data: CreateEspacioEmpleadoDto): Promise<EspacioEmpleado> {
    try {
      console.log('=== INICIO create espacios-empleados ===');
      console.log('data:', data);
      
      if (!data.espacio_id || !data.cedula) {
        throw new BadRequestException('espacio_id y cedula son requeridos');
      }

      const espacio = await this.espacioRepository.findOne({ where: { id: data.espacio_id } });
      if (!espacio) {
        throw new NotFoundException(`El espacio ${data.espacio_id} no existe`);
      }
      console.log('Espacio encontrado:', espacio);

      const empleado = await this.crearOBuscarEmpleado(data.cedula, data.nombre);
      console.log('Empleado creado/encontrado:', empleado);

      const asignacionExistente = await this.espacioEmpleadoRepository
        .createQueryBuilder('ae')
        .where('ae.espacio_id = :espacioId', { espacioId: data.espacio_id })
        .andWhere('ae.activo = :activo', { activo: true })
        .getOne();
        
      if (asignacionExistente) {
        throw new BadRequestException(`El espacio ${data.espacio_id} ya tiene una asignación activa`);
      }

      const asignacionExistentePorCedula = await this.espacioEmpleadoRepository
        .createQueryBuilder('ae')
        .where('ae.cedula = :cedula', { cedula: data.cedula })
        .andWhere('ae.activo = :activo', { activo: true })
        .getOne();
        
      if (asignacionExistentePorCedula) {
        throw new BadRequestException(`El empleado con cédula ${data.cedula} ya tiene un espacio asignado`);
      }

      const asignacion = new EspacioEmpleado();
      asignacion.espacio_id = data.espacio_id;
      asignacion.empleado_id = empleado.id;
      asignacion.cedula = data.cedula;
      asignacion.porcentaje_descuento = Number(data.porcentaje_descuento) || 100;
      asignacion.activo = true;
      asignacion.fecha_inicio = new Date();

      console.log('Guardando asignacion:', asignacion);
      const savedAsignacion = await this.espacioEmpleadoRepository.save(asignacion);
      console.log('Asignacion guardada:', savedAsignacion);
      
      espacio.estado = EstadoEspacio.RESERVADO;
      espacio.es_para_empleado = true;
      espacio.empleado_asignado_id = empleado.id;
      await this.espacioRepository.save(espacio);
      console.log('Espacio actualizado a RESERVADO');

      console.log('=== FIN create espacios-empleados ===');
      return savedAsignacion;
    } catch (error: any) {
      console.error('=== ERROR en create espacios-empleados ===');
      console.error('Tipo de error:', error.name);
      console.error('Código:', error.code);
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un registro con esos datos (violación de restricción única)');
      }
      
      if (error.code === '23503') {
        throw new BadRequestException('Referencia a espacio o empleado no válida');
      }
      
      throw new BadRequestException(`Error al crear la asignación: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateEspacioEmpleadoDto): Promise<EspacioEmpleado> {
    const asignacion = await this.findById(id);

    if (data.porcentaje_descuento !== undefined) {
      asignacion.porcentaje_descuento = data.porcentaje_descuento;
    }
    if (data.activo !== undefined) {
      asignacion.activo = data.activo;
    }
    if (data.fecha_inicio !== undefined) {
      asignacion.fecha_inicio = new Date(data.fecha_inicio);
    }
    if (data.fecha_fin !== undefined) {
      asignacion.fecha_fin = new Date(data.fecha_fin);
    }

    return this.espacioEmpleadoRepository.save(asignacion);
  }

  async deactivate(id: number): Promise<EspacioEmpleado> {
    const asignacion = await this.findById(id);
    
    asignacion.activo = false;
    asignacion.fecha_fin = new Date();

    const espacio = await this.espacioRepository.findOne({ where: { id: asignacion.espacio_id } });
    if (espacio) {
      espacio.empleado_asignado_id = null;
      espacio.es_para_empleado = false;
      espacio.estado = EstadoEspacio.DISPONIBLE;
      await this.espacioRepository.save(espacio);
    }

    return this.espacioEmpleadoRepository.save(asignacion);
  }

  async remove(id: number): Promise<void> {
    const asignacion = await this.findById(id);
    
    const espacio = await this.espacioRepository.findOne({ where: { id: asignacion.espacio_id } });
    if (espacio) {
      espacio.empleado_asignado_id = null;
      espacio.es_para_empleado = false;
      espacio.estado = EstadoEspacio.DISPONIBLE;
      await this.espacioRepository.save(espacio);
    }

    await this.espacioEmpleadoRepository.remove(asignacion);
  }

  async getEspaciosParaEmpleados(): Promise<Espacio[]> {
    return this.espacioRepository.find({
      where: { es_para_empleado: true },
      relations: ['empleadoAsignado'],
      order: { id: 'ASC' },
    });
  }

  async getReporteNomina(fechaInicio?: string, fechaFin?: string): Promise<any[]> {
    try {
      console.log('========================================');
      console.log('getReporteNomina - Ejecutando consulta...');
      
      const resultados: any[] = [];
      const espaciosProcesados = new Set<string>();

      const asignacionesEspaciosEmpleados = await this.espacioEmpleadoRepository
        .createQueryBuilder('ae')
        .leftJoinAndSelect('ae.espacio', 'espacio')
        .leftJoinAndSelect('ae.empleado', 'empleado')
        .where('ae.activo = :activo', { activo: true })
        .orderBy('ae.fecha_creacion', 'DESC')
        .getMany();

      console.log('Asignaciones espacios_empleados encontradas:', asignacionesEspaciosEmpleados.length);

      for (const asignacion of asignacionesEspaciosEmpleados) {
        const espacioId = asignacion.espacio_id;
        espaciosProcesados.add(espacioId);
        
        console.log('  - Asignacion ID:', asignacion.id, '- Espacio:', espacioId, '- Cedula:', asignacion.cedula);
        
        let nombreEmpleado = 'Sin nombre';
        let emailEmpleado = '';
        let rolEmpleado = 'EMPLEADO';
        
        if (asignacion.empleado) {
          nombreEmpleado = asignacion.empleado.nombre;
          emailEmpleado = asignacion.empleado.email;
          rolEmpleado = asignacion.empleado.rol;
        } else if (asignacion.cedula) {
          nombreEmpleado = `Empleado ${asignacion.cedula}`;
          emailEmpleado = `empleado_${asignacion.cedula}@parkpro.com`;
        }

        resultados.push({
          id: asignacion.id,
          tipoRegistro: 'ASIGNACION_EMPLEADO',
          empleado: {
            id: asignacion.empleado?.id || null,
            nombre: nombreEmpleado,
            cedula: asignacion.cedula || '',
            email: emailEmpleado,
            rol: rolEmpleado,
          },
          espacio: {
            id: espacioId,
            tipo: asignacion.espacio?.tipo_permitido || 'AUTOMOVIL',
            estado: asignacion.espacio?.estado || 'RESERVADO',
            seccion: asignacion.espacio?.seccion || '',
            numero: asignacion.espacio?.numero || 0,
          },
          porcentajeDescuento: Number(asignacion.porcentaje_descuento) || 100,
          fechaInicio: asignacion.fecha_inicio,
          fechaFin: asignacion.fecha_fin,
          activo: asignacion.activo,
        });
      }

      const espaciosConEmpleadosDirectos = await this.espacioRepository
        .createQueryBuilder('espacio')
        .leftJoinAndSelect('espacio.empleadoAsignado', 'empleado')
        .where('espacio.es_para_empleado = :esParaEmpleado', { esParaEmpleado: true })
        .andWhere('espacio.empleado_asignado_id IS NOT NULL')
        .orderBy('empleado.nombre', 'ASC')
        .getMany();

      console.log('Espacios con empleados directos (no en espacios_empleados):', espaciosConEmpleadosDirectos.length);

      for (const espacio of espaciosConEmpleadosDirectos) {
        if (espaciosProcesados.has(espacio.id)) {
          continue;
        }
        
        console.log('  - Espacio directo:', espacio.id, '- Empleado:', espacio.empleadoAsignado?.nombre);
        
        resultados.push({
          id: espacio.id,
          tipoRegistro: 'ESPACIO_DIRECTO',
          empleado: {
            id: espacio.empleadoAsignado?.id,
            nombre: espacio.empleadoAsignado?.nombre || 'Sin nombre',
            cedula: espacio.empleadoAsignado?.cedula || '',
            email: espacio.empleadoAsignado?.email || '',
            rol: espacio.empleadoAsignado?.rol || 'EMPLEADO',
          },
          espacio: {
            id: espacio.id,
            tipo: espacio.tipo_permitido || 'AUTOMOVIL',
            estado: espacio.estado || 'RESERVADO',
            seccion: espacio.seccion || '',
            numero: espacio.numero || 0,
          },
          porcentajeDescuento: 100,
          fechaInicio: espacio.fecha_actualizacion,
          activo: true,
        });
      }

      console.log('Total resultados finales:', resultados.length);
      console.log('========================================');
      return resultados;
    } catch (error) {
      console.error('Error en getReporteNomina:', error);
      throw error;
    }
  }
}
