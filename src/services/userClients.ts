import { supabase } from '../lib/supabase';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : import.meta.env.VITE_API_BASE_URL;

export interface UserClientAttribution {
  id: string;
  user_id: string;
  client_id: string;
  created_at: string;
  clients: {
    id: string;
    nom: string;
    email?: string;
    telephone?: string;
  };
}

export interface UserClientsData {
  attributions: UserClientAttribution[];
  createdClients: {
    id: string;
    nom: string;
    email?: string;
    telephone?: string;
    created_at: string;
  }[];
}

export async function getUserClients(userId: string): Promise<UserClientsData> {
  const response = await fetch(`${API_BASE}/api/admin/user-clients/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la récupération des clients utilisateur');
  }

  const data = await response.json();
  // Nouvelle API : data.clients = clients attribués, data.createdClients = clients créés par l’employé
  const createdClients = (data.createdClients || []).map((c: any) => ({
    id: c.id,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone,
    created_at: c.created_at
  }));
  // Correction : mapping pour garantir la structure attendue par le composant
  const attributions = (data.clients || []).map((attr: any) => ({
    id: attr.id,
    user_id: attr.user_id,
    client_id: attr.client_id,
    created_at: attr.created_at,
    clients: attr.clients // objet client joint
  }));
  return {
    attributions,
    createdClients
  };
}

export async function addUserClient(userId: string, clientId: string): Promise<UserClientAttribution> {
  const response = await fetch(`${API_BASE}/api/admin/user-clients`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      client_id: clientId
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de l\'ajout de l\'attribution');
  }

  const data = await response.json();
  return data.attribution;
}

export async function removeUserClient(attributionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/user-clients/${attributionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la suppression de l\'attribution');
  }
}
