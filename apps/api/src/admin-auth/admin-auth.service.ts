import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  login(login: string, password: string): string {
    const expectedLogin = this.config.get<string>('ADMIN_LOGIN');
    const hash = this.config.get<string>('ADMIN_PASSWORD_HASH');
    if (!expectedLogin || !hash || login !== expectedLogin || !compareSync(password, hash)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.jwt.sign({ sub: 'admin' });
  }
}
