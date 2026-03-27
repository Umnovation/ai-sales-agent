export interface User {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface InstallRequest {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

export interface TokenResponse {
  readonly token: string;
  readonly user: User;
}
