import 'dotenv/config';
import express from 'express';
import { body, validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../types/auth';

const router = express.Router();

 // Initialize Supabase admin client (service role) for server-side privileged operations and token validation
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Optional anon client used only as fallback for token validation if admin client rejects with "Invalid API key"
const supabaseAnon = process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY)
  : null;

// Admin-only auth middleware: verify Supabase JWT locally and ensure role ADMIN (case-insensitive)
const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

    // Verify Supabase JWT using Supabase's built-in method
    const { data: authUser, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !authUser.user) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

    const userId = authUser.user.id;
    const email = authUser.user.email;

    // Lookup profile in public.users by id OR email
    const orParts: string[] = [];
    if (userId) orParts.push(`id.eq.${userId}`);
    if (email) orParts.push(`email.eq.${email}`);
    const orFilter = orParts.join(',');

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

// Apply admin auth middleware to all routes in this router
router.use(adminAuth);

// GET /api/admin/users - List all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    
    // Get all users from the public.users table
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    res.json({ success: true, users: users || [] });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      code: 'FETCH_USERS_ERROR',
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/users - Create a new user
router.post('/users', [
  body('name').notEmpty().withMessage('Le nom est requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role').isIn(['admin', 'exploitation', 'facturation']).withMessage('Rôle invalide')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, email, password, role, email_signature } = req.body;
    const { phone_number: phone_number_1 } = req.body;
    
    console.log('🔍 DEBUG CREATE USER - Request body:', req.body);
    console.log('🔍 DEBUG CREATE USER - phone_number extracted:', phone_number_1);
    const { phone_number: phone_number_2 } = req.body;

    // Map UI roles to DB roles
    const dbRole = role === 'exploitation' ? 'exploit' : role === 'facturation' ? 'compta' : role;

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Skip email confirmation
    });

    if (authError) {
      const rawMsg = (authError as any).message || String(authError);
      const status = (authError as any).status;
      if (/already/i.test(rawMsg)) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_EXISTS',
          message: 'Un compte existe déjà pour cet email'
        });
      }
      if (status === 400 || status === 422 || /password/i.test(rawMsg)) {
        return res.status(400).json({
          success: false,
          code: 'WEAK_PASSWORD',
          message: rawMsg.includes('Password') ? rawMsg : 'Mot de passe invalide'
        });
      }
      return res.status(500).json({
        success: false,
        code: 'AUTH_CREATE_ERROR',
        message: 'Erreur lors de la création du compte',
        error: rawMsg
      });
    }

    if (!authUser.user) {
      return res.status(500).json({
        success: false,
        code: 'AUTH_CREATE_NO_USER',
        message: 'Aucun utilisateur créé'
      });
    }

    // Create user profile in public.users table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authUser.user.id,
        name,
        email,
        phone_number: phone_number_1,
phone_number_alt: phone_number_2,

        role: dbRole,
        metadata: { email_signature }
      }])
      .select()
      .single();

    console.log('🔍 DEBUG CREATE USER - Data sent to Supabase:', {
      id: authUser.user.id,
      name,
      email,
      phone_number: phone_number_1,
      role: dbRole,
      metadata: { email_signature }
    });
    console.log('🔍 DEBUG CREATE USER - Supabase response:', userProfile);
    console.log('🔍 DEBUG CREATE USER - Supabase error:', profileError);
    if (profileError) {
      // If profile creation fails, delete the auth user to maintain consistency
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return res.status(500).json({
        success: false,
        code: 'PROFILE_CREATE_ERROR',
        message: `Erreur lors de la création du profil: ${profileError.message}`
      });
    }

    res.status(201).json({ 
      success: true,
      message: 'Utilisateur créé avec succès',
      user: userProfile
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      success: false,
      code: 'CREATE_USER_ERROR',
      message: 'Erreur lors de la création de l\'utilisateur',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/admin/users/:id - Update a user
router.put('/users/:id', [
  body('name').notEmpty().withMessage('Le nom est requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('role').isIn(['admin', 'exploitation', 'facturation']).withMessage('Rôle invalide'),
  body('password').optional().isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check validation errors
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
    const { name, email, role, password, email_signature } = req.body;
    const { phone_number: phone_number_3 } = req.body;

    
    console.log('🔍 DEBUG UPDATE USER - Request body:', req.body);
    console.log('🔍 DEBUG UPDATE USER - phone_number extracted:', phone_number_3);
    const { phone_number: phone_number_4 } = req.body;


    // Map UI roles to DB roles
    const dbRole = role === 'exploitation' ? 'exploit' : role === 'facturation' ? 'compta' : role;

    // Update user in Supabase Auth
    const authUpdateData: any = { email };
    if (password) {
      authUpdateData.password = password;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdateData);

    if (authError) {
      throw new Error(`Erreur lors de la mise à jour du compte: ${authError.message}`);
    }

    // Update user profile in public.users table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .update({
        name,
        email,
        phone_number: phone_number_3,
        role: dbRole,
        metadata: { email_signature }
      })
      .eq('id', id)
      .select()
      .single();

    console.log('🔍 DEBUG UPDATE USER - Data sent to Supabase:', {
      name,
      email,
      phone_number: phone_number_3,
      role: dbRole,
      metadata: { email_signature }
    });
    console.log('🔍 DEBUG UPDATE USER - Supabase response:', userProfile);
    console.log('🔍 DEBUG UPDATE USER - Supabase error:', profileError);
    if (profileError) {
      throw new Error(`Erreur lors de la mise à jour du profil: ${profileError.message}`);
    }

    res.json({ 
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: userProfile
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false,
      code: 'UPDATE_USER_ERROR',
      message: 'Erreur lors de la mise à jour de l\'utilisateur',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user?.id === id) {
      return res.status(400).json({ 
        success: false,
        code: 'CANNOT_DELETE_SELF',
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Delete user from public.users table first
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (profileError) {
      throw new Error(`Erreur lors de la suppression du profil: ${profileError.message}`);
    }

    // Delete user from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      throw new Error(`Erreur lors de la suppression du compte: ${authError.message}`);
    }

    res.json({ 
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      code: 'DELETE_USER_ERROR',
      message: 'Erreur lors de la suppression de l\'utilisateur',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.use((err: any, _req: AuthRequest, res: Response, _next: NextFunction) => {
  console.error('Unhandled error in /api/admin routes:', err);
  const status = (err && (err.status || err.statusCode)) || 500;
  res.status(status).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: (err && err.message) ? err.message : 'Erreur serveur',
    error: (err && err.error) ? err.error : (err instanceof Error ? err.message : String(err))
  });
});

export default router;
