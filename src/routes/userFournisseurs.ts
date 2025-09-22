import express from 'express';
import { param, validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../types/auth';

// Factory function for the router, inject supabaseAdmin
export default function createUserFournisseursRouter(supabaseAdmin) {
  const router = express.Router();

  // Auth middleware - verifies JWT and loads req.user (any role)
  const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

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

    const orParts: string[] = [];
    if (sub) orParts.push(`id.eq.${sub}`);
    if (email) orParts.push(`email.eq.${email}`);
    const orFilter = orParts.join(',');

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .or(orFilter)
      .single();

    if (!profile) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

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

  // GET /api/admin/user-fournisseurs/:userId - Get fournisseurs attributed to a user
  router.get('/:userId', requireAuth, [
    param('userId').isUUID().withMessage('ID utilisateur invalide')
  ], async (req: AuthRequest, res: Response) => {
  let attributions: any[] = [];
  let createdFournisseurs: any[] = [];

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: true,
        attributions: [],
        createdFournisseurs: []
      });
    }

    if (!req.user) {
      return res.json({
        success: true,
        attributions: [],
        createdFournisseurs: []
      });
    }

    let targetUserId: string;
    if (req.user.role === 'ADMIN' || req.user.role === 'admin') {
      targetUserId = req.params.userId;
    } else {
      targetUserId = req.user.id;
    }

    // Fournisseurs attribués (logique identique à user_clients)
    const { data: attributionsRaw, error: attributionsError } = await supabaseAdmin
      .from('user_fournisseurs')
      .select(`
        id,
        fournisseur_id,
        user_id,
        created_at,
        fournisseurs(id, nom, email, telephone)
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    let attributions = [];
    if (!attributionsError && attributionsRaw) attributions = attributionsRaw;

    // Fournisseurs créés par l'utilisateur
    const { data: userCreatedFournisseurs, error: createdError } = await supabaseAdmin
      .from('fournisseurs')
      .select('id, nom, email, telephone, created_at, created_by')
      .eq('created_by', targetUserId)
      .order('created_at', { ascending: false });

    if (!createdError && userCreatedFournisseurs) createdFournisseurs = userCreatedFournisseurs;

    return res.json({
      success: true,
      attributions,
      createdFournisseurs
    });
  } catch (error) {
    return res.json({
      success: true,
      attributions: [],
      createdFournisseurs: []
    });
  }
});

  // POST /api/admin/user-fournisseurs
  router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
    const { user_id, fournisseur_id } = req.body;
    if (!user_id || !fournisseur_id) {
      return res.status(400).json({ success: false, error: 'user_id et fournisseur_id requis' });
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('user_fournisseurs')
        .insert([{ user_id, fournisseur_id, created_at: new Date().toISOString() }])
        .select()
        .single();

      if (error) {
        console.error('Supabase INSERT user_fournisseurs error:', error);
        throw error;
      }

      res.json({ success: true, attribution: data });
    } catch (err) {
      console.error('POST /api/admin/user-fournisseurs error:', err);
      res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
    }
  });

  return router;
}
