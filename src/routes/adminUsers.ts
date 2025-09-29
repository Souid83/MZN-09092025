import express from 'express';

/**
 * Crée un routeur adminUsers avec le client Supabase fourni.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export default function createAdminUsersRouter(supabase, adminSupabase) {
  const router = express.Router();

  /**
   * POST /api/admin/users
   * Crée un nouvel utilisateur (auth + table users)
   */
  router.post('/', async (req, res) => {
    try {
      console.log('POST /api/admin/users body:', req.body);
      const { name, email, role, password, email_signature } = req.body;

      // 1. Créer le compte auth (Supabase Auth)
      const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      console.log('admin.createUser result:', { authUser, authError });

      if (authError) {
        console.error('Supabase AUTH error:', authError);
        throw authError;
      }

      // 2. Insérer dans la table users (avec l’id auth)
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: authUser.user.id,
          name,
          email,
          role,
          metadata: { email_signature }
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase INSERT error:', error);
        throw error;
      }

      res.json({ success: true, user: data });
    } catch (err) {
      console.error('POST /api/admin/users error:', err);
      res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
    }
  });

  /**
   * DELETE /api/admin/users/:id
   * Supprime un utilisateur par son id
   */
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // 1. Supprimer le compte auth (Supabase Auth)
      const { error: authError } = await adminSupabase.auth.admin.deleteUser(id);
      if (authError) {
        console.error('Supabase AUTH delete error:', authError);
        throw authError;
      }

      // 2. Supprimer dans la table users
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase DELETE error:', error);
        throw error;
      }

      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/admin/users/:id error:', err);
      res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
    }
  });

  /**
   * PUT /api/admin/users/:id
   * Met à jour un utilisateur par son id
   */
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, email_signature, password } = req.body;
    try {
      // 1. Si un nouveau mot de passe est fourni, le mettre à jour dans Supabase Auth
      if (password) {
        const { error: pwError } = await adminSupabase.auth.admin.updateUserById(id, { password });
        if (pwError) {
          console.error('Supabase AUTH password update error:', pwError);
          throw pwError;
        }
      }

      // 2. Mettre à jour la table users
      const { data, error } = await supabase
        .from('users')
        .update({
          name,
          email,
          role,
          metadata: { email_signature }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase UPDATE error:', error);
        throw error;
      }

      res.json({ success: true, user: data });
    } catch (err) {
      console.error('PUT /api/admin/users/:id error:', err);
      res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
    }
  });

  return router;
}
