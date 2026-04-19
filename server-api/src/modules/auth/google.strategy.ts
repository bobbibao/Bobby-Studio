import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const clientID =
      process.env.GOOGLE_CLIENT_ID ||
      'local-google-client-id-disabled';
    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET ||
      'local-google-client-secret-disabled';
    const missingOAuthKeys =
      !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;

    super({
      clientID,
      clientSecret,
      callbackURL: 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });

    if (missingOAuthKeys) {
      // Keep auth module bootable in local pipeline mode without external OAuth keys.
      Logger.warn(
        'Google OAuth keys are not set. Google login is disabled for this environment.',
        GoogleStrategy.name,
      );
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
    };
    done(null, user);
  }
}
