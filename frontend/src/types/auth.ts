import { IEditorConfigResponse } from './configs';

export interface ISignupRequest {
  email: string;
  password: string;
  // name: string;
  // gender: string;
  // address: string;
  // country: string;
  // phoneNumber: string;
  // firstname: string;
  // lastname: string;
}

export interface ISignupResponse {
  user: User;
  configuration: IEditorConfigResponse;
}
export interface ISigninRequest {
  email: string;
  password: string;
}

export interface ISigninResponse {
  access_token: string;
  configurations: IEditorConfigResponse;
  userId: string;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  plan: string | null;
  gender: string | null;
  address: string | null;
  country: string | null;
  phoneNumber: string | null;
}

export interface IAuthState {
  user?: User;
}

