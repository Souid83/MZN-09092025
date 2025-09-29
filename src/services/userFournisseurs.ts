import { supabase } from '../lib/supabase';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : import.meta.env.VITE_API_BASE_URL;

export interface UserFournisseurAttribution {
  id: string;
  user_id: string;
  fournisseur_id: string;
  created_at: string;
  fournisseurs: {
    id: string;
    nom: string;
    email?: string;
    telephone?: string;
  };
}

export interface UserFournisseursData {
  attributions: UserFournisseurAttribution[];
  createdFournisseurs: {
    id: string;
    nom: string;
    email?: string;
    telephone?: string;
    created_at: string;
    created_by?: string;
  }[];
}

export async function getUserFournisseurs(userId: string): Promise<UserFournisseursData> {
  const response = await fetch(`${API_BASE}/api/admin/user-fournisseurs/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la récupération des fournisseurs utilisateur');
  }

  const data = await response.json();
  return {
    attributions: data.attributions || [],
    createdFournisseurs: data.createdFournisseurs || []
  };
}

export async function addUserFournisseur(userId: string, fournisseurId: string): Promise<UserFournisseurAttribution> {
  const response = await fetch(`${API_BASE}/api/admin/user-fournisseurs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      fournisseur_id: fournisseurId
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de l\'ajout de l\'attribution fournisseur');
  }

  const data = await response.json();
  return data.attribution;
}

export async function removeUserFournisseur(attributionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/user-fournisseurs/${attributionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la suppression de l\'attribution fournisseur');
  }
}
