import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario, RolUsuario, TurnoOperador } from '../../database/entities';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private usersRepository: Repository<Usuario>,
  ) {}

  async findAll(): Promise<Usuario[]> {
    return this.usersRepository.find({
      select: ['id', 'nombre', 'username', 'email', 'rol', 'turno', 'activo', 'ultimo_acceso', 'fecha_creacion', 'cedula'],
      order: { nombre: 'ASC' },
    });
  }

  async findSystemUsers(): Promise<Usuario[]> {
    return this.usersRepository
      .createQueryBuilder('usuario')
      .select([
        'usuario.id',
        'usuario.nombre',
        'usuario.username',
        'usuario.email',
        'usuario.rol',
        'usuario.turno',
        'usuario.activo',
        'usuario.ultimo_acceso',
        'usuario.fecha_creacion',
        'usuario.cedula',
      ])
      .where('usuario.username NOT LIKE :pattern', { pattern: 'emp_%' })
      .andWhere('usuario.activo = :activo', { activo: true })
      .orderBy('usuario.nombre', 'ASC')
      .getMany();
  }

  async findById(id: number): Promise<Usuario> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'nombre', 'username', 'email', 'rol', 'turno', 'activo', 'ultimo_acceso', 'fecha_creacion', 'password_hash'],
    });
    
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    
    return user;
  }

  async findByUsername(username: string): Promise<Usuario> {
    const user = await this.usersRepository.findOne({
      where: { username },
    });
    
    return user || null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<Usuario> {
    const user = await this.usersRepository.findOne({
      where: [
        { username: identifier },
        { email: identifier },
      ],
    });
    
    return user || null;
  }

  async findByEmail(email: string): Promise<Usuario> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });
    
    return user || null;
  }

  async create(createUserDto: CreateUserDto): Promise<Usuario> {
    const { password, ...rest } = createUserDto;
    
    const existingByUsername = await this.findByUsername(createUserDto.username);
    if (existingByUsername) {
      throw new BadRequestException('El nombre de usuario ya existe');
    }

    const existingByEmail = await this.findByEmail(createUserDto.email);
    if (existingByEmail) {
      throw new BadRequestException('El email ya está registrado');
    }

    const user = this.usersRepository.create({
      ...rest,
      password_hash: await bcrypt.hash(password, 10),
    });
    
    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un usuario con esa cédula, nombre de usuario o email');
      }
      throw error;
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<Usuario> {
    const user = await this.findById(id);
    
    if (updateUserDto.password) {
      user.password_hash = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    if (updateUserDto.nombre) user.nombre = updateUserDto.nombre;
    if (updateUserDto.username) user.username = updateUserDto.username;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.rol) user.rol = updateUserDto.rol;
    if (updateUserDto.turno) user.turno = updateUserDto.turno;
    if (updateUserDto.activo !== undefined) user.activo = updateUserDto.activo;
    
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  async updateLastAccess(id: number): Promise<void> {
    await this.usersRepository.update(id, { ultimo_acceso: new Date() });
  }

  async changePassword(id: number, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }
    
    await this.usersRepository.update(id, {
      password_hash: await bcrypt.hash(newPassword, 10),
    });
  }

  async findByRole(rol: RolUsuario): Promise<Usuario[]> {
    return this.usersRepository.find({
      where: { rol, activo: true },
      select: ['id', 'nombre', 'username', 'email', 'rol', 'turno'],
    });
  }

  async setupAdmin(): Promise<{ message: string; user?: Usuario }> {
    const password_hash = await bcrypt.hash('Admin123!', 10);
    
    const existingAdmin = await this.findByUsername('admin');
    if (existingAdmin) {
      await this.usersRepository.update(existingAdmin.id, {
        password_hash,
        activo: true,
        rol: 'Administrador' as RolUsuario,
      });
      return { message: 'Contraseña del admin reseteada a Admin123!' };
    }

    const admin = this.usersRepository.create({
      nombre: 'Administrador Sistema',
      username: 'admin',
      password_hash,
      email: 'admin@parkpro.com',
      rol: 'Administrador' as RolUsuario,
      activo: true,
    });

    const saved = await this.usersRepository.save(admin);
    return { message: 'Usuario admin creado exitosamente', user: saved };
  }

  async setupDemoUsers(): Promise<{ message: string; users?: Usuario[] }> {
    const defaultPassword = 'ParkPro2024!';
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    const demoUsers = [
      { username: 'supervisor', nombre: 'Juan Supervisor', email: 'supervisor@parkpro.com', rol: 'Supervisor' as RolUsuario, turno: 'Matutino' as TurnoOperador },
      { username: 'operador1', nombre: 'Pedro Operador', email: 'operador1@parkpro.com', rol: 'Operador' as RolUsuario, turno: 'Matutino' as TurnoOperador },
      { username: 'operador2', nombre: 'María Operadora', email: 'operador2@parkpro.com', rol: 'Operador' as RolUsuario, turno: 'Vespertino' as TurnoOperador },
      { username: 'tecnico', nombre: 'Carlos Técnico', email: 'tecnico@parkpro.com', rol: 'Tecnico' as RolUsuario, turno: 'Rotativo' as TurnoOperador },
    ];

    const users: Usuario[] = [];

    for (const userData of demoUsers) {
      const existingUser = await this.findByUsername(userData.username);
      if (!existingUser) {
        const user = this.usersRepository.create({
          ...userData,
          password_hash,
          activo: true,
        });
        const saved = await this.usersRepository.save(user);
        users.push(saved);
      } else {
        await this.usersRepository.update(existingUser.id, {
          password_hash,
          activo: true,
        });
      }
    }

    return { message: `Usuarios demo configurados/actualizados`, users };
  }
}
