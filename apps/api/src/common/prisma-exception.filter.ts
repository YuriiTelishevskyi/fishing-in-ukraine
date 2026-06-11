import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

const CODE_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Unique constraint violation' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Related record does not exist' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const mapped = CODE_MAP[e.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
    };
    res
      .status(mapped.status)
      .json({ statusCode: mapped.status, message: mapped.message, code: e.code });
  }
}
