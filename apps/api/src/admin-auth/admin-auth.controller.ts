import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ADMIN_COOKIE } from './admin.guard';
import { AdminAuthService } from './admin-auth.service';
import { LoginDto } from './dto/login.dto';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const token = this.auth.login(dto.login, dto.password);
    res.cookie(ADMIN_COOKIE, token, { ...COOKIE_OPTS, maxAge: 7 * 24 * 3600 * 1000 });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_COOKIE, COOKIE_OPTS);
    return { ok: true };
  }
}
