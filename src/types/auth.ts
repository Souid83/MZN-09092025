export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EXPLOITATION' | 'FACTURATION';
}

export interface JwtPayload {
  id: string;
  role: string;
  name: string;
}

export interface AuthRequest extends Express.Request {
  user?: User;
}