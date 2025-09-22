import express from 'express';

/**
 * Crée un routeur pour l'attribution de clients aux utilisateurs (user_clients).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export default function createAdminUserClientsRouter(supabase) {
  const router = express.Router();

  /**
   * POST /api/admin/user-clients
   * Attribue un client à un utilisateur (ajoute une ligne dans user_clients)
   * Body: { user_id: string, client_id: string }
   */
  router.post('/', async (req, res) => {
    const { user_id, client_id } = req.body;
    if (!user_id || !client_id) {
      return res.status(400).json({ success: false, error: 'user_id et client_id requis' });
    }
    try {
      const { data, error } = await supabase
        .from('user_clients')
        .insert([{ user_id, client_id }])
        .select()
        .single();

      if (error) {
        console.error('Supabase INSERT user_clients error:', error);
        throw error;
      }

      res.json({ success: true, attribution: data });
    } catch (err) {
      console.error('POST /api/admin/user-clients error:', err);
      res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
    }
  });

  /**
   * GET /api/admin/user-clients/:user_id
   * Récupère la liste des clients attribués à un utilisateur
   */
  router.get('/:user_id', async (req, res) => {
    const { user_id } = req.params;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id requis' });
    }
    try {
      // Récupérer les clients attribués à l'utilisateur avec leurs infos
      const { data: attribRows, error: attribError } = await supabase
        .from('user_clients')
        .select('id, client_id, created_at')
        .eq('user_id', user_id);

      if (attribError) {
        console.error('Supabase SELECT user_clients error:', attribError);
        throw attribError;
      }

      const clientIds = (attribRows || []).map(row => row.client_id);
      console.log('[API DEBUG] user_id:', user_id, 'clientIds:', clientIds, 'attributions:', attribRows);
      if (clientIds.length === 0) {
        return res.json({ success: true, clients: [], debug: { attributions: attribRows, clients: [] } });
      }

      // Récupérer les infos des clients attribués
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, nom, email, created_by')
        .in('id', clientIds);

      console.log('[API DEBUG] clients query result:', clients);

      if (clientsError) {
        console.error('Supabase SELECT clients error:', clientsError);
        throw clientsError;
      }

      // Correction : structure d’attribution attendue avec id et created_at
      const attributions = (attribRows || []).map(attr => {
        const client = (clients || []).find(c => c.id === attr.client_id);
        return {
          id: attr.id,
          client_id: attr.client_id,
          created_at: attr.created_at,
          clients: client ? {
            id: client.id,
            nom: client.nom,
            email: client.email,
            created_by: client.created_by
          } : null
        };
      });

      // Récupérer les clients créés par l'employé (hors attributions explicites)
      const { data: createdClients, error: createdClientsError } = await supabase
        .from('clients')
        .select('id, nom, email, created_by')
        .eq('created_by', user_id);

      if (createdClientsError) {
        console.error('Supabase SELECT createdClients error:', createdClientsError);
        throw createdClientsError;
      }

      // Exclure les doublons (déjà dans attributions)
      const createdClientsFiltered = (createdClients || []).filter(c => !clientIds.includes(c.id));

      console.log('[API DEBUG] final result sent:', attributions, 'createdClients:', createdClientsFiltered);

      res.json({
        success: true,
        clients: attributions,
        createdClients: createdClientsFiltered,
        debug: { attributions, clients, createdClients: createdClientsFiltered }
      });
    } catch (err) {
      console.error('GET /api/admin/user-clients/:user_id error:', err);
      res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
    }
  });

  // (Optionnel : DELETE pour gérer les attributions)

  return router;
}
