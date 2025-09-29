import 'dotenv/config';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const supabaseAnon = process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY)
  : null;

export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

    // Decode Supabase JWT locally using SUPABASE_JWT_SECRET
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    } catch {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

    const sub = (payload && (payload.sub || payload.user_id)) as string | undefined;
    const email = (payload && payload.email) as string | undefined;

    if (!sub && !email) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

    // Build OR filter based on available identifiers
    const orParts: string[] = [];
    if (sub) orParts.push(`id.eq.${sub}`);
    if (email) orParts.push(`email.eq.${email}`);
    const orFilter = orParts.join(',');

    // Lookup profile in public.users by id OR email
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .or(orFilter)
      .single();

    if (!profile || String(profile.role).toUpperCase() !== 'ADMIN') {
      return res.status(401).json({ success: false, code: 'ADMIN_REQUIRED', message: 'Unauthorized' });
    }

    // Attach complete profile from DB to req.user
    req.user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role
    };

    next();
  } catch (_err) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Accès non autorisé' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide' });
  }
};

export const checkRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Accès non autorisé', code: 'UNAUTHORIZED' });
    }

    const allowed = roles.map(r => String(r).toUpperCase());
    const current = String(req.user.role || '').toUpperCase();

    if (!allowed.includes(current)) {
      return res.status(403).json({ success: false, message: 'Permission refusée', code: 'FORBIDDEN' });
    }

    next();
  };
};
