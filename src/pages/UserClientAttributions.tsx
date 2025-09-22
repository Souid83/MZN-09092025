import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, Trash2, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserClients, addUserClient, removeUserClient } from '../services/userClients';
import type { User, Client } from '../types';
import type { UserClientsData, UserClientAttribution } from '../services/userClients';
import toast from 'react-hot-toast';

export default function UserClientAttributions() {
  const [exploitationUsers, setExploitationUsers] = useState<User[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userClientsData, setUserClientsData] = useState<UserClientsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUserClients, setLoadingUserClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [adding, setAdding] = useState(false);

  // Charge uniquement la liste des utilisateurs exploitation au montage
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('role', ['exploit', 'exploitation'])
          .order('name');
        if (usersError) throw usersError;
        setExploitationUsers(users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Erreur lors du chargement des employés');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Recharge les clients attribués/créés à chaque changement d'employé sélectionné
  useEffect(() => {
    if (selectedUserId) {
      fetchUserClients();
    } else {
      setUserClientsData(null);
    }
  }, [selectedUserId]);

  // Charge tous les clients (pour la liste déroulante d'attribution) au montage
  useEffect(() => {
    const fetchAllClients = async () => {
      try {
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, nom, email, telephone')
          .order('nom');
        if (clientsError) throw clientsError;
        setAllClients(clients || []);
      } catch (error) {
        console.error('Error fetching all clients:', error);
        toast.error('Erreur lors du chargement des clients');
      }
    };
    fetchAllClients();
  }, []);

  const fetchUserClients = async () => {
    if (!selectedUserId) return;

    setLoadingUserClients(true);
    try {
      console.log('[fetchUserClients] selectedUserId:', selectedUserId);
      const data = await getUserClients(selectedUserId);
      console.log('[fetchUserClients] API response:', data);
      setUserClientsData(data);
    } catch (error) {
      console.error('Error fetching user clients:', error);
      toast.error('Erreur lors du chargement des clients de l\'utilisateur');
    } finally {
      setLoadingUserClients(false);
    }
  };

  const handleAddClient = async () => {
    if (!selectedUserId || !selectedClientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    setAdding(true);
    try {
      await addUserClient(selectedUserId, selectedClientId);
      toast.success('Client attribué avec succès');
      setShowAddClient(false);
      setSelectedClientId('');
      setSearchTerm('');
      await fetchUserClients();
    } catch (error) {
      console.error('Error adding client attribution:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'attribution du client');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAttribution = async (attributionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette attribution ?')) return;

    try {
      await removeUserClient(attributionId);
      toast.success('Attribution supprimée avec succès');
      await fetchUserClients();
    } catch (error) {
      console.error('Error removing client attribution:', error);
      toast.error('Erreur lors de la suppression de l\'attribution');
    }
  };

  // Retourne la liste des clients disponibles à attribuer (non déjà attribués/ni créés)
  const getAvailableClients = () => {
    if (!userClientsData) {
      console.log('[getAvailableClients] Pas de userClientsData, retourne allClients:', allClients);
      return allClients;
    }

    // IDs des clients déjà attribués ou créés par l'utilisateur sélectionné
    const attributedClientIds = new Set([
      ...userClientsData.attributions.map(attr => attr.client_id),
      ...userClientsData.createdClients.map(client => client.id)
    ]);

    // Filtre les clients déjà attribués/créés
    const available = allClients.filter(client => !attributedClientIds.has(client.id));
    console.log('[getAvailableClients] attributedClientIds:', attributedClientIds, 'available:', available);
    return available;
  };

  const filteredAvailableClients = getAvailableClients().filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = exploitationUsers.find(user => user.id === selectedUserId);

  // Récupérer le rôle de l'utilisateur connecté (depuis localStorage ou contexte)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  useEffect(() => {
    // À adapter selon ton contexte d'authentification
    const session = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    setCurrentUserRole(session?.user?.role || null);
  }, []);

  if (userClientsData) {
    // Log structure pour debug
    // eslint-disable-next-line no-console
    console.log('attributions', userClientsData.attributions);
  }

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UserCheck className="w-8 h-8" />
          Attribution clients par employé
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des employés */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Users size={20} />
            Employés exploitation
          </h2>

          <div className="space-y-2">
            {exploitationUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedUserId(user.id);
                  setUserClientsData(null);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedUserId === user.id
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </button>
            ))}
          </div>

          {exploitationUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun employé exploitation trouvé
            </div>
          )}
        </div>

        {/* Détails de l'employé sélectionné */}
        <div className="lg:col-span-2">
          {selectedUserId ? (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  Clients attribués à {selectedUser?.name}
                </h2>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Attribuer un client
                </button>
              </div>

              {loadingUserClients ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-600">Chargement...</div>
                </div>
              ) : userClientsData ? (
                <div className="space-y-6">
                  {/* Clients créés par l'employé */}
                  {userClientsData.createdClients.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4 text-green-700">
                        Clients créés par {selectedUser?.name} ({userClientsData.createdClients.length})
                      </h3>
                      <div className="space-y-2">
                        {userClientsData.createdClients.map((client) => (
                          <div
                            key={client.id}
                            className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div>
                              <div className="font-medium text-green-800">{client.nom}</div>
                              <div className="text-sm text-green-600">
                                {client.email && `${client.email} • `}
                                {client.telephone}
                              </div>
                              <div className="text-xs text-green-500">
                                Créé le {new Date(client.created_at).toLocaleDateString('fr-FR')}
                              </div>
                              <div className="text-xs text-green-700 font-semibold">
                                Créé par {selectedUser?.name}
                              </div>
                            </div>
                            {/* Pas de bouton suppression pour les clients créés par l'employé */}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clients attribués par l'admin */}
                  {userClientsData.attributions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4 text-blue-700">
                        Clients attribués par l'admin ({userClientsData.attributions.length})
                      </h3>
                      <div className="space-y-2">
                        {userClientsData.attributions
                          .filter(attribution => attribution.clients)
                          .map((attribution) => (
                          <div
                            key={attribution.id}
                            className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <div>
                              <div className="font-medium text-blue-800">{attribution.clients.nom}</div>
                              <div className="text-sm text-blue-600">
                                {attribution.clients.email && `${attribution.clients.email} • `}
                                {attribution.clients.telephone}
                              </div>
                              {/* <div className="text-xs text-blue-500">
                                Attribué le {new Date(attribution.created_at).toLocaleDateString('fr-FR')}
                              </div> */}
                            </div>
                            {/* Bouton suppression visible uniquement pour l'admin */}
                            {currentUserRole === 'ADMIN' && (
                              <button
                                onClick={() => handleRemoveAttribution(attribution.id)}
                                className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                                title="Retirer l'attribution"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aucun client */}
                  {userClientsData.attributions.length === 0 && userClientsData.createdClients.length === 0 && (
                    <div className="text-center py-12">
                      <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        Aucun client attribué
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Cet employé n'a accès à aucun client pour le moment.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Sélectionnez un employé
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choisissez un employé dans la liste pour voir et gérer ses attributions clients.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout de client */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Attribuer un client</h2>
              <button
                onClick={() => {
                  setShowAddClient(false);
                  setSearchTerm('');
                  setSelectedClientId('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employé sélectionné
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{selectedUser?.name}</div>
                  <div className="text-sm text-gray-500">{selectedUser?.email}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rechercher un client
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher par nom de client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client à attribuer
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un client</option>
                  {filteredAvailableClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.nom}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {filteredAvailableClients.length} client(s) disponible(s)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowAddClient(false);
                  setSearchTerm('');
                  setSelectedClientId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAddClient}
                disabled={!selectedClientId || adding}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? 'Attribution...' : 'Attribuer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
