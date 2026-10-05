import { Controller, Post, Get, UseGuards, Res, Request, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { AuthenticatedRequest } from '../identity/principal';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService
  ) {}

  /** Records the sign-in of the authenticated caller (identity comes from the verified ID token). */
  @Post('session')
  @HttpCode(200)
  async createSession(@Request() req: AuthenticatedRequest) {
    try {
      return await this.authService.recordSession(req.currentUser);
    } catch (error) {
      throw new HttpException((error as Error).message || 'Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('email-verify')
  @UseGuards(AuthGuard)
  async isUserActive(
      @Request() req, @Res() res
    ) {
    try {
      const language = String(req.query?.language || 'en');
      const currentUser = (req as any).currentUser || (req as any).user;

      if (!currentUser || !currentUser.email) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (currentUser.emailVerified === true) {
        return res.status(400).json({ message: 'Email is already verified.' });
      }
      await this.authService.emailVerification(currentUser.email, language);
      return res.status(200).json({ message: 'Email verification successfully sent.' });
    } catch (error: any) {
      const msg = error?.message || 'Failed to send verification email';
      return res.status(500).json({ message: msg });
    }
  }
}
