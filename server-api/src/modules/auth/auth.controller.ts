import { Controller, Post, Body, Get, UseGuards, Req, Res,Request, HttpException, HttpStatus } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { CreateUserDTO } from '../user/dto';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { AuthGuard } from './auth.guard';
import { SignInResponse } from '../attribute/dto/common.dto';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService
  ) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'User sign-up' })
  @ApiResponse({ status: 201, description: 'User successfully signed up.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async signUp(@Body() createUserDTO: CreateUserDTO) {
    return this.authService.signUp(createUserDTO);
  }

  @Post('sign-in')
  @ApiOperation({ summary: 'User sign-in' })
  @ApiResponse({ status: 200, description: 'User successfully signed in.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async signIn(@Body() signInDto: SignInDto): Promise<SignInResponse> {
    return this.authService.signIn(signInDto);
  }

  @Get('google')
  @UseGuards(PassportAuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 Login' })
  @ApiResponse({ status: 200, description: 'Redirects to Google login page' })
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(PassportAuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 Callback' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Google' })
  async googleAuthRedirect(@Req() req, @Res() res) {
    const result = await this.authService.googleLogin(req.user);
    // Redirect to frontend with token
    res.redirect(`http://localhost:4200/auth/callback?token=${result.access_token}`);
  }

  @Post('session')
  async createSession(@Req() req, @Res() res) {
    // basic rate limiter for this route
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
    });

    // run limiter
    await new Promise<void>((resolve, reject) => {
      try {
        limiter(req, res, (err: any) => {
          if (err) return reject(err);
          return resolve();
        });
      } catch (e) {
        return reject(e);
      }
    });

    // Accept token from Authorization header or body.idToken
    const authHeader = (req.headers && (req.headers.authorization as string)) || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body?.idToken;
    try {
      const result = await this.authService.createSessionFromToken(idToken);
      return res.status(200).json(result);
    } catch (e: any) {
      throw new HttpException(e.message || 'Unauthorized', HttpStatus.UNAUTHORIZED);
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
