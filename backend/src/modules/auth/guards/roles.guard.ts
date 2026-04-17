import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '../../../database/entities';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.rol) {
      throw new ForbiddenException('Acceso denegado: usuario no autenticado');
    }

    const hasRole = requiredRoles.some((rol) => user.rol === rol);
    if (!hasRole) {
      throw new ForbiddenException(`Acceso denegado: se requiere rol ${requiredRoles.join(' o ')}`);
    }

    return true;
  }
}
