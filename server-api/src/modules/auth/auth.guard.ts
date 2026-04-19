import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserService } from '../user/user.service';
import { CreateNewUserDTO } from '../user/dto';
import {
  BASIC_USER_ROLE,
  PRO_USER_ROLE,
  DEFAULT_USER_ROLE,
  FREE_USER_ROLE,
} from '../../config/roles.config';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from './public.decorator';

// Role metadata
export const ROLE_KEY = 'role';
export const Role = (role: string) => SetMetadata(ROLE_KEY, role);

// Define CurrentUser interface
interface CurrentUser {
  id: string;
  role: string;
  email: string;
  isAdmin: boolean;
  hasCompletedSurvey: boolean;
  userRoleName?: string;
  firebaseUser?: admin.auth.DecodedIdToken;
  language: string;
  emailVerified?: boolean;
}

// Extend Request interface
interface AuthenticatedRequest extends Request {
  currentUser?: CurrentUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Bypass if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    try {
      // Bypass logic
      const bypass_api_token = this.checkByPassToken(request);
      const bypass_user_id = this.getByPassUserId(request);
      if (bypass_api_token && bypass_user_id) {
        request.currentUser = {
          id: bypass_user_id,
          email: 'bypassed@gmail.com',
          role: DEFAULT_USER_ROLE,
          isAdmin: false,
          hasCompletedSurvey: true,
          userRoleName: PRO_USER_ROLE,
          language: 'en',
        };
        return true;
      }

      const requiredRole =
        this.reflector.getAllAndOverride<string>(ROLE_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) ?? DEFAULT_USER_ROLE;

      const token = this.extractToken(request);
      if (!token) return false;

      const firebaseUser = await admin.auth().verifyIdToken(token);
      if (!firebaseUser) return false;

      const isGoogleSignup = firebaseUser.firebase?.sign_in_provider === 'google.com';
      const checkUser = await this.userService.getById(firebaseUser.uid);
      const email = firebaseUser.email;

      if (!checkUser) {
        const userDto = new CreateNewUserDTO();
        userDto.id = firebaseUser.uid;
        userDto.email = email;
        userDto.role = DEFAULT_USER_ROLE;
        userDto.password = 'securePassword123'; // TODO: no need it anymore
        if (isGoogleSignup) {
          userDto.emailVerified = firebaseUser.email_verified;
        }
        await this.userService.createUserFromFirebase(userDto);
      }
      
      const userDb = await this.userService.getById(firebaseUser.uid);

      // Update emailVerified for Google sign ups that still have it false in our DB
      if (isGoogleSignup && firebaseUser.email_verified && !userDb.emailVerified) {
        await this.userService.updateEmailVerified(firebaseUser.uid, true);
      }
      //TODO: remove after fixbug by LongHoang
      // console.log(userDb)
      request.currentUser = {
        id: firebaseUser.uid,
        email: email,
        role: userDb.role ?? DEFAULT_USER_ROLE,
        isAdmin: userDb.isAdmin ?? false,
        hasCompletedSurvey: userDb.surveyCompletedAt != null,
        userRoleName: userDb.role ?? DEFAULT_USER_ROLE,
        firebaseUser: firebaseUser,
        language: userDb.language ?? 'en',
        emailVerified: firebaseUser.email_verified,
      };

      if (requiredRole === BASIC_USER_ROLE && userDb.role === PRO_USER_ROLE) {
        return true;
      }

      if (requiredRole == FREE_USER_ROLE) {
        return true;
      }

      return requiredRole === userDb.role;
    } catch (error) {
      console.error('Authorization failed:', error.message);
      return false;
    }
  }

  private extractToken(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (!authorization) return null;
    return authorization.replace(/bearer\s+/i, '').trim();
  }

  private checkByPassToken(request: Request): boolean {
    const token = request.headers['bypass_api_token'];
    return typeof token === 'string' && token === process.env.BYPASS_API_TOKEN;
  }

  private getByPassUserId(request: Request): string | null {
    const userId = request.headers['bypass_api_user_id'];
    return typeof userId === 'string' ? userId : null;
  }
}
