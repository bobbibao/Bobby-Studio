import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CurrentUser } from '../identity/principal';
import { ResendService } from '../resend/resend.service';

@Injectable()
export class AuthService {
  // In-memory throttle to avoid a database write on every session refresh (per API instance).
  private readonly loginCooldown = new Map<string, number>();
  private static readonly COOLDOWN_MS = 5 * 60 * 1000;
  private static readonly MAX_SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

  constructor(
    private readonly resendService: ResendService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /** Records a sign-in for an already authenticated principal. */
  async recordSession(principal: CurrentUser) {
    const authAgeSeconds = Math.floor(Date.now() / 1000) - (principal.firebaseUser?.auth_time ?? 0);
    if (authAgeSeconds > AuthService.MAX_SESSION_AGE_SECONDS) {
      throw new Error('Stale session');
    }

    const now = Date.now();
    let user = await this.prisma.user.findUnique({
      where: { id: principal.id },
      select: { lastLogin: true, isActive: true },
    });
    if ((this.loginCooldown.get(principal.id) ?? 0) <= now) {
      user = await this.prisma.user.update({
        where: { id: principal.id },
        data: { lastLogin: new Date(now) },
        select: { lastLogin: true, isActive: true },
      });
      this.loginCooldown.set(principal.id, now + AuthService.COOLDOWN_MS);
    }
    return { ok: true, uid: principal.id, lastLogin: user.lastLogin, isActive: user.isActive };
  }

  async emailVerification(email: string, language: string): Promise<void> {
    try {
      const verifyLink = await admin.auth().generateEmailVerificationLink(email);
      // The official emulator exposes the generated OOB code locally; it does not deliver email.
      if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return;
      const { subject, html } = await this.emailService.buildVerificationEmail(language, verifyLink);
      await this.resendService.sendEmail(email, subject, html);
    } catch (error) {
      console.error(error);
      throw new Error('Failed to send verification email');
    }
  }
}
