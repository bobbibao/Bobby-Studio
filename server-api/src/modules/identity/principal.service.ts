import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEFAULT_USER_ROLE } from '../../config/roles.config';
import { CurrentUser } from './principal';

/**
 * Turns a Firebase ID token into the application principal.
 *
 * Verification always goes through the Firebase Admin SDK (against the Auth Emulator in
 * development and test, against Firebase Authentication elsewhere). There is no alternative
 * identity path: a missing or invalid credential is a 401, never a default user.
 */
@Injectable()
export class PrincipalService {
  private readonly logger = new Logger(PrincipalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async authenticateToken(token: string): Promise<CurrentUser> {
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired credentials');
    }
    return this.resolvePrincipal(decoded);
  }

  async resolvePrincipal(decoded: admin.auth.DecodedIdToken): Promise<CurrentUser> {
    if (!decoded.email) {
      throw new ForbiddenException('The account must have an email address');
    }

    let user = await this.prisma.user.findUnique({ where: { id: decoded.uid } });
    if (!user) {
      user = await this.provision(decoded);
    }
    if (user.isActive === false) {
      throw new ForbiddenException('This account has been deactivated');
    }

    const isGoogle = decoded.firebase?.sign_in_provider === 'google.com';
    if (isGoogle && decoded.email_verified && !user.emailVerified) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    }

    return {
      id: user.id,
      email: decoded.email,
      role: user.role ?? DEFAULT_USER_ROLE,
      isAdmin: user.isAdmin ?? false,
      hasCompletedSurvey: user.surveyCompletedAt != null,
      userRoleName: user.role ?? DEFAULT_USER_ROLE,
      firebaseUser: decoded,
      language: user.language ?? 'en',
      emailVerified: decoded.email_verified,
    };
  }

  /** First sign-in provisions the account. Concurrent first requests converge on one row. */
  private async provision(decoded: admin.auth.DecodedIdToken) {
    try {
      return await this.prisma.user.create({
        data: {
          id: decoded.uid,
          email: decoded.email!,
          role: DEFAULT_USER_ROLE,
          emailVerified: decoded.firebase?.sign_in_provider === 'google.com' ? !!decoded.email_verified : false,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.user.findUnique({ where: { id: decoded.uid } });
        if (existing) return existing;
      }
      this.logger.error(`Account provisioning failed: ${(error as Error).message}`);
      throw error;
    }
  }
}
