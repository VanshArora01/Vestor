import type { User } from "./user";

export interface ErrorDetail {
  code: string;
  message: string;
  errors?: unknown;
}

export interface ErrorEnvelope {
  detail: ErrorDetail;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
