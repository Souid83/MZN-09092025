import type { Request } from 'express';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface JwtPayload {
  id: string;
  role: string;
  name: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: User;
}
