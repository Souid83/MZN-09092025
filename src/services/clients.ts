import { supabase } from '../lib/supabase';
import type { Client, CreateClientPayload } from '../types';

export async function getClients(): Promise<Client[]> {
  // Récupère la session et le rôle utilisateur
  let query = supabase
    .from('clients')
    .select('id, nom, email, telephone, adresse_facturation, preference_facturation, tva_rate, numero_commande_requis, siret, numero_tva, country_id, opening_hours, created_at, updated_at, created_by, client_contacts(*)');

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    console.log('[getClients] userId:', userId);
    if (userId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const roleUpper = userRow?.role ? String(userRow.role).toUpperCase() : '';
      console.log('[getClients] user role:', roleUpper);
      if (roleUpper !== 'ADMIN') {
        // Employé : clients créés OU attribués
        // 1. Récupérer les client_id attribués à l'utilisateur
        const { data: attributions, error: attribError } = await supabase
          .from('user_clients')
          .select('client_id')
          .eq('user_id', userId);

        if (attribError) {
          console.error('[getClients] Attribution fetch error:', attribError);
          return [];
        }

        const attributedClientIds = (attributions || []).map(a => a.client_id);

        // 2. Récupérer les clients créés OU attribués
        let orFilter = `created_by.eq.${userId}`;
        if (attributedClientIds.length > 0) {
          orFilter += `,id.in.(${attributedClientIds.map(id => `"${id}"`).join(',')})`;
        }
        console.log('[getClients] or filter:', orFilter);

        query = query.or(orFilter);
      }
      // ADMIN : pas de filtre, voit tout
    }
  } catch (err) {
    // Si session/role lookup échoue, retourne []
    console.error('[getClients] Session/role lookup error:', err);
    return [];
  }

  const { data: clients, error: clientsError } = await query.order('nom', { ascending: true });
  console.log('[getClients] clients result:', clients, 'error:', clientsError);

  if (clientsError || !clients) {
    // Toujours retourner [] en cas d’erreur
    return [];
  }

  // Enrichit chaque client avec accounting_contact
  const clientsWithAccountingContacts = await Promise.all(
    clients.map(async (client) => {
      try {
        const { data: accountingContact, error: accountingError } = await supabase
          .from('client_accounting_contacts')
          .select('*')
          .eq('client_id', client.id)
          .maybeSingle();

        if (accountingError) {
          console.error(`Error fetching accounting contact for client ${client.id}:`, accountingError);
        }

        return {
          ...client,
          accounting_contact: accountingContact || undefined
        };
      } catch (error) {
        console.error(`Error processing client ${client.id}:`, error);
        return {
          ...client,
          accounting_contact: undefined
        };
      }
    })
  );

  return clientsWithAccountingContacts;
}

export async function createClient(client: CreateClientPayload): Promise<Client> {
  // Récupérer l'id de l'utilisateur connecté pour le champ created_by
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error('Utilisateur non authentifié : impossible de créer un client sans userId');
  }
  if (!userId) {
    console.error('[DEBUG-UNIQUE] userId est null ou undefined ! sessionData:', sessionData);
  } else {
    console.log('[DEBUG-UNIQUE] userId used for created_by:', userId);
  }

  const { data: newClient, error: clientError } = await supabase
    .from('clients')
    .insert([{
      nom: client.nom,
      email: client.email,
      telephone: client.telephone,
      adresse_facturation: client.adresse_facturation,
      preference_facturation: client.preference_facturation,
      tva_rate: client.tva_rate,
      numero_commande_requis: client.numero_commande_requis,
      siret: client.siret,
      numero_tva: client.numero_tva,
      country_id: client.country_id,
      opening_hours: client.opening_hours,
      created_by: userId || null
    }])
    .select()
    .single();

  if (clientError) {
    throw new Error(`Error creating client: ${clientError.message}`);
  }

  // Create contacts
  if (client.contacts?.length > 0) {
    const { error: contactsError } = await supabase
      .from('client_contacts')
      .insert(
        client.contacts.map(contact => ({
          id: crypto.randomUUID(),
          ...contact,
          client_id: newClient.id
        }))
      );

    if (contactsError) {
      throw new Error(`Error creating contacts: ${contactsError.message}`);
    }
  }

  // Create accounting contact
  if (client.accounting_contact) {
    const { error: accountingError } = await supabase
      .from('client_accounting_contacts')
      .insert([{
        id: crypto.randomUUID(),
        ...client.accounting_contact,
        client_id: newClient.id
      }]);

    if (accountingError) {
      throw new Error(`Error creating accounting contact: ${accountingError.message}`);
    }
  }

  return getClients().then(clients => 
    clients.find(c => c.id === newClient.id) as Client
  );
}

export async function updateClient(id: string, client: Partial<CreateClientPayload>): Promise<Client> {
  const { error: clientError } = await supabase
    .from('clients')
    .update({
      nom: client.nom,
      email: client.email,
      telephone: client.telephone,
      adresse_facturation: client.adresse_facturation,
      preference_facturation: client.preference_facturation,
      tva_rate: client.tva_rate,
      numero_commande_requis: client.numero_commande_requis,
      siret: client.siret,
      numero_tva: client.numero_tva,
      country_id: client.country_id,
      opening_hours: client.opening_hours
    })
    .eq('id', id);

  if (clientError) {
    throw new Error(`Error updating client: ${clientError.message}`);
  }

  // Update contacts if provided
  if (client.contacts) {
    // Delete existing contacts
    await supabase
      .from('client_contacts')
      .delete()
      .eq('client_id', id);

    // Insert new contacts
    if (client.contacts.length > 0) {
      const { error: contactsError } = await supabase
        .from('client_contacts')
        .insert(
          client.contacts.map(contact => ({
            id: crypto.randomUUID(),
            ...contact,
            client_id: id
          }))
        );

      if (contactsError) {
        throw new Error(`Error updating contacts: ${contactsError.message}`);
      }
    }
  }

  // Update accounting contact if provided
  if (client.accounting_contact) {
    // Delete existing accounting contact
    await supabase
      .from('client_accounting_contacts')
      .delete()
      .eq('client_id', id);

    // Insert new accounting contact
    const { error: accountingError } = await supabase
      .from('client_accounting_contacts')
      .insert([{
        id: crypto.randomUUID(),
        ...client.accounting_contact,
        client_id: id
      }]);

    if (accountingError) {
      throw new Error(`Error updating accounting contact: ${accountingError.message}`);
    }
  }

  return getClients().then(clients => 
    clients.find(c => c.id === id) as Client
  );
}

export async function deleteClients(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .in('id', ids);

  if (error) {
    throw new Error(`Error deleting clients: ${error.message}`);
  }
}
