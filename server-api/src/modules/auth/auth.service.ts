import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { SignInDto } from './dto/sign-in.dto';
import { CreateUserDTO } from '../user/dto';
import { ConfigurationService } from '../profile-config/configuration.service';
import { ConfigurationDto } from '../attribute/dto/configuration.dto';
import { User } from '@prisma/client';
import { SignInResponse } from '../attribute/dto/common.dto';
import * as admin from 'firebase-admin';
import { ResendService } from '../resend/resend.service';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private jwtService: JwtService,
    private resendService: ResendService,
    private prisma: PrismaService,
    private emailService: EmailService,
    @Inject(forwardRef(() => ConfigurationService))
    private configurationService: ConfigurationService,
  ) {}

  async signUp(createUserDTO: CreateUserDTO): Promise<{ user: User, configuration: ConfigurationDto }> {
    const hashedPassword = await bcrypt.hash(createUserDTO.password, 10);
    const user = await this.userService.createUser({
      ...createUserDTO,
      password: hashedPassword,
    });
    if (!user) {
      throw new Error('Failed to create user');
    }
    const configuration = await this.configurationService.createDefaultConfiguration(user.id);
    if (!configuration) {
      throw new Error('Failed to create default configuration');
    }

    return { user, configuration };
  }

  async signIn(signInDto: SignInDto): Promise<SignInResponse> {
    const { email, password } = signInDto;
    
    const user: User = await this.userService.findByEmail(email);
    const isCompared = await bcrypt.compare(password, user.password)
    if(user.isActive == false){
      throw new Error('Account have been deactivated. Please contact the admin.');
    }
    if (user && isCompared) {
      const payload = { email: signInDto.email, sub: user.id };
      const configuration: ConfigurationDto = await this.configurationService.getUserConfigurations(user.id);
      return {
        userId: user.id,
        access_token: this.jwtService.sign(payload),
        configurations: configuration,
      };
    }
    throw new Error('Invalid Sign In');
  }
  

  async googleLogin(user: any): Promise<{ access_token: string, configurations: ConfigurationDto }> {
    // Check if user exists
    let dbUser: User = await this.userService.findByEmail(user.email);
     if(user.isActive == false){
      throw new Error('Account have been deactivated. Please contact the admin.');
    }
    if (!dbUser) {
      // Create new user if doesn't exist
      dbUser = await this.userService.createUser({
        email: user.email,
        password: '',
      });
      
      // Create default configuration
      await this.configurationService.createDefaultConfiguration(dbUser.id);
      // Assign default role
      await this.userService.addRoleToUser(dbUser.id, 'User');
    }

    const payload = { email: dbUser.email, sub: dbUser.id };
    const configuration = await this.configurationService.getConfigurationsByUserId(dbUser.id);
    
    return {
      access_token: this.jwtService.sign(payload),
      configurations: configuration,
    };
  }

    // Helper to check JWT-like string
  private looksLikeJwt(token: any) {
    return typeof token === 'string' && token.split('.').length === 3;
  }

  // In-memory throttle to avoid DB updates on every login (single instance only)
  private uidCooldown = new Map<string, number>();
  private COOLDOWN_MS = 5 * 60 * 1000;

  private shouldSkipUpdate(uid: string) {
    const now = Date.now();
    const next = this.uidCooldown.get(uid) || 0;
    if (now < next) return true;
    this.uidCooldown.set(uid, now + this.COOLDOWN_MS);
    return false;
  }

  async createSessionFromToken(idToken: string) {
    if (!idToken || !this.looksLikeJwt(idToken)) {
      throw new Error('Invalid token');
    }
    let decoded: any;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      throw new Error('Unauthorized');
    }
    const authTime = Math.floor(Date.now() / 1000) - (decoded.auth_time || 0);
    // Prevent very stale login tokens (example: older than 7 days)
    if (authTime > 60 * 60 * 24 * 7) {
      throw new Error('Stale session');
    }
    
    const existingUser = await this.userService.findByEmail(decoded.email);
    if (!this.shouldSkipUpdate(decoded.uid)) {
      
      try {
        if (!existingUser) {
          throw new Error('User not found');
        }
        await this.prisma.user.update({
          where: { id: decoded.uid },
          data: { lastLogin: new Date() },
        });
      } catch (e) {
        // swallow update errors to not block session creation
        console.error('Failed to sync user from firebase token', e);
      }
    }

    return { ok: true, uid: decoded.uid, lastLogin: existingUser.lastLogin, isActive: existingUser.isActive };
  }



  async emailVerification(email: string, language: string): Promise<void> {
    try {
      const verifyLink = await admin.auth().generateEmailVerificationLink(email);
      const { subject, html } = await this.emailService.buildVerificationEmail(
        language,
        verifyLink,
      );
      await this.resendService.sendEmail(email, subject, html);
    } catch (error) {
      console.error(error);
      throw new Error('Failed to send verification email');
    }
  }

}
