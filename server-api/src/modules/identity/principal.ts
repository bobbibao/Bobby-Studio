import { Request } from 'express';
import * as admin from 'firebase-admin';

/** The authenticated caller, derived only from a verified Firebase ID token and the user's database row. */
export interface CurrentUser {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
  hasCompletedSurvey: boolean;
  userRoleName?: string;
  firebaseUser?: admin.auth.DecodedIdToken;
  language: string;
  emailVerified?: boolean;
}

export interface AuthenticatedRequest extends Request {
  currentUser?: CurrentUser;
}
