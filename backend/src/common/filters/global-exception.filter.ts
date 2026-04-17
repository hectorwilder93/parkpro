import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        error = resp.error || 'Error';
        details = resp.details;
      }
    } else if (exception instanceof Error) {
      const pgError = exception as any;
      
      if (pgError.code === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'Ya existe un registro con esos datos';
        error = 'Duplicate Entry';
      } else if (pgError.code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Referencia a datos que no existen';
        error = 'Foreign Key Violation';
      } else if (pgError.code === '22P02') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Tipo de dato inválido';
        error = 'Invalid Input Syntax';
      } else {
        message = exception.message;
        this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      }
    }

    response.status(status).json({
      statusCode: status,
      error: error,
      message: Array.isArray(message) ? message : [message],
      ...(process.env.NODE_ENV !== 'production' && { details }),
    });
  }
}
