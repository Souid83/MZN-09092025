import express from 'express';
import { body, param, validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../types/auth';

const router = express.Router();

// Initialize Supabase admin client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    if (!profile) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

    // Attach user info for downstream handlers
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

// Admin-only auth middleware - requires ADMIN role
const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    // Attach user info for downstream handlers
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

/**
 * GET /api/admin/user-clients/:userId - Get clients attributed to a user
 * - ADMIN: can view attributions/clients for any user (by :userId param)
 * - Non-admin: can only view their own attributions/clients (ignores :userId param)
 */
router.get('/user-clients/:userId', requireAuth, [
  param('userId').isUUID().withMessage('ID utilisateur invalide')
], async (req: AuthRequest, res: Response) => {
  let attributions: any[] = [];
  let createdClients: any[] = [];

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: true,
        attributions: [],
        createdClients: []
      });
    }

    if (!req.user) {
      return res.json({
        success: true,
        attributions: [],
        createdClients: []
      });
    }

    // LOG: Who is making the request and for which userId
    console.log('[user-clients] req.user:', req.user);
    console.log('[user-clients] req.params.userId:', req.params.userId);

    // Determine which userId to use for filtering
    let targetUserId: string;
    if (req.user.role === 'ADMIN') {
      // ADMIN can view any user's attributions/clients
      targetUserId = req.params.userId;
    } else {
      // Non-admin can only view their own
      targetUserId = req.user.id;
    }
    console.log('[user-clients] targetUserId used for filtering:', targetUserId);

    // Clients attributed to the user (structure identique à fournisseurs)
    const { data: userAttributions, error: attributionsError } = await supabaseAdmin
      .from('user_clients')
      .select(`
        id,
        client_id,
        user_id,
        created_at,
        clients(id, nom, email, telephone)
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    // Correction : on renvoie bien la structure d’attribution attendue
    if (!attributionsError && userAttributions) {
      attributions = userAttributions.map(attr => ({
        id: attr.id,
        client_id: attr.client_id,
        user_id: attr.user_id,
        created_at: attr.created_at,
        clients: attr.clients
      }));
    }

    // Clients created by the user
    const { data: userCreatedClients, error: createdError } = await supabaseAdmin
      .from('clients')
      .select('id, nom, email, telephone, created_at, created_by')
      .eq('created_by', targetUserId)
      .order('created_at', { ascending: false });

    if (createdError) {
      console.error('[user-clients] createdError:', createdError);
    }
    if (!createdError && userCreatedClients) createdClients = userCreatedClients;

    // LOG: What is returned
    console.log('[user-clients] attributions:', attributions);
    console.log('[user-clients] createdClients:', createdClients);

    // LOG FINAL juste avant envoi
    console.log('[API DEBUG] attributions to send:', attributions);

    return res.json({
      success: true,
      clients: attributions,
      createdClients
    });
  } catch (error) {
    console.error('[user-clients] Caught error:', error);
    return res.json({
      success: true,
      attributions: [],
      createdClients: []
    });
  }
});

// POST /api/admin/user-clients - Add client attribution to user
router.post('/user-clients', requireAdmin, [
  body('user_id').isUUID().withMessage('ID utilisateur invalide'),
  body('client_id').isUUID().withMessage('ID client invalide')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { user_id, client_id } = req.body;

    // Check if attribution already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('user_clients')
      .select('id')
      .eq('user_id', user_id)
      .eq('client_id', client_id)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'ATTRIBUTION_EXISTS',
        message: 'Cette attribution existe déjà'
      });
    }

    // Create new attribution
    const { data: attribution, error: insertError } = await supabaseAdmin
      .from('user_clients')
      .insert([{ user_id, client_id }])
      .select(`
        id,
        user_id,
        client_id,
        created_at,
        clients!inner(id, nom, email, telephone)
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({ 
      success: true,
      message: 'Attribution créée avec succès',
      attribution
    });
  } catch (error) {
    console.error('Error creating user client attribution:', error);
    res.status(500).json({ 
      success: false,
      code: 'CREATE_ATTRIBUTION_ERROR',
      message: 'Erreur lors de la création de l\'attribution',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/admin/user-clients/:id - Remove client attribution
router.delete('/user-clients/:id', requireAdmin, [
  param('id').isUUID().withMessage('ID attribution invalide')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Delete attribution
    const { error: deleteError } = await supabaseAdmin
      .from('user_clients')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    res.json({ 
      success: true,
      message: 'Attribution supprimée avec succès'
    });
  } catch (error) {
    console.error('Error deleting user client attribution:', error);
    res.status(500).json({ 
      success: false,
      code: 'DELETE_ATTRIBUTION_ERROR',
      message: 'Erreur lors de la suppression de l\'attribution',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
