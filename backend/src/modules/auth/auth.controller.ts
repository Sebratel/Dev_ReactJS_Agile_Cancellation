import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from '@/modules/auth/auth.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { GoogleLoginDto } from '@/modules/auth/dto/google-login.dto';
import { LogoutDto } from '@/modules/auth/dto/logout.dto';
import { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('dev-login')
  devLogin(@Body('email') email: string) {
    return this.authService.devLogin(email);
  }

  @Public()
  @Post('google')
  loginWithGoogle(@Body() body: GoogleLoginDto) {
    return this.authService.loginWithGoogle(body);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Public()
  @Post('logout')
  logout(
    @Body() body: LogoutDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.authService.logout(body, authorization);
  }
}
